"""Headless Sandbox Runtime API Service.

FastAPI service providing remote control and telemetry streaming for the sandbox
execution environment. This service wraps the existing forensic capabilities
while enabling remote orchestration from the web dashboard.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from collections import deque
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from forensics_sandbox_agent.app.config.loader import load_settings
from forensics_sandbox_agent.app.logging.logger import configure_logging
from forensics_sandbox_agent.app.services.service_registry import ServiceRegistry
from forensics_sandbox_agent.domain.entities.forensic_session import ForensicSession, SessionStatus
from forensics_sandbox_agent.infrastructure.execution.session_orchestrator import SessionOrchestrator
from forensics_sandbox_agent.infrastructure.monitoring.monitoring_coordinator import ForensicMonitoringCoordinator
from forensics_sandbox_agent.infrastructure.monitoring.event_models import ForensicEvent


class SessionState(str, Enum):
    """Runtime session state."""
    PENDING = "pending"
    INITIALIZING = "initializing"
    RESTORING_SNAPSHOT = "restoring_snapshot"
    BOOTING_VM = "booting_vm"
    EXECUTING = "executing"
    MONITORING = "monitoring"
    ANALYZING = "analyzing"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"
    COMPLETED = "completed"
    FAILED = "failed"


class StartSessionRequest(BaseModel):
    """Request to start a new sandbox session."""
    simulator_id: str
    auto_rollback: bool = True
    timeout_seconds: int = 300


class SessionResponse(BaseModel):
    """Session information response."""
    session_id: str
    state: SessionState
    simulator_id: str
    created_at: str
    updated_at: str
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Service health response."""
    status: str
    version: str
    uptime_seconds: float
    vm_status: dict
    active_sessions: int
    telemetry_connections: int


class TelemetryEvent(BaseModel):
    """Telemetry event for streaming."""
    session_id: str
    timestamp: str
    event_type: str
    category: str
    data: dict


class SystemLogEvent(BaseModel):
    """System/operational log event for streaming."""
    timestamp: str
    level: str
    message: str
    session_id: Optional[str] = None
    source: str = "runtime"


@dataclass
class RuntimeSession:
    """Active runtime session state."""
    session_id: str
    state: SessionState
    simulator_id: str
    created_at: datetime
    updated_at: datetime
    forensic_session: Optional[ForensicSession] = None
    error: Optional[str] = None
    events: list[dict] = field(default_factory=list)


class SandboxRuntimeAPI:
    """FastAPI service for sandbox runtime control."""

    def __init__(self):
        self._settings = None
        self._logger = None
        self._services: Optional[ServiceRegistry] = None
        self._start_time = datetime.now()
        self._sessions: dict[str, RuntimeSession] = {}

        self._telemetry_clients: set[WebSocket] = set()
        self._telemetry_queue: asyncio.Queue = asyncio.Queue(maxsize=10000)
        self._telemetry_task: Optional[asyncio.Task] = None

        self._system_log_clients: set[WebSocket] = set()
        self._system_log_queue: asyncio.Queue = asyncio.Queue(maxsize=5000)
        self._system_log_task: Optional[asyncio.Task] = None

        self._runtime_logs: deque = deque(maxlen=1000)
        self._cleanup_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None

    async def _heartbeat_loop(self) -> None:
        """Periodically send heartbeats for active sessions to the backend."""
        import urllib.request
        import urllib.error

        while True:
            try:
                await asyncio.sleep(30)
                active = {
                    sid: s for sid, s in self._sessions.items()
                    if s.state not in (SessionState.COMPLETED, SessionState.FAILED)
                }
                if not active:
                    continue
                for session_id in active:
                    await self._send_heartbeat(session_id)
            except asyncio.CancelledError:
                break
            except Exception:
                pass

    async def _send_heartbeat(self, session_id: str) -> None:
        """Send a single heartbeat for a session to the backend."""
        import urllib.request
        import urllib.error
        try:
            session = self._sessions.get(session_id)
            if not session:
                return
            payload = json.dumps({
                "status": session.state.value,
                "vmState": session.state.value,
                "memoryUsage": 0,
                "cpuUsage": 0,
            }).encode("utf-8")
            agent_secret = os.environ.get("SANDBOX_AGENT_SECRET", "")
            req = urllib.request.Request(
                f"http://127.0.0.1:3000/api/v1/sync/sessions/{session_id}/heartbeat",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Agent-Secret": agent_secret,
                },
                method="POST",
            )
            await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=10))
        except Exception:
            pass

    async def _cleanup_loop(self) -> None:
        """Periodically clean up completed/failed sessions and orphaned VBox processes."""
        while True:
            try:
                await asyncio.sleep(60)
                terminal = [sid for sid, s in self._sessions.items()
                            if s.state in (SessionState.COMPLETED, SessionState.FAILED)]
                for sid in terminal:
                    self._sessions.pop(sid, None)
                if terminal:
                    self._add_log("INFO", f"Cleaned up {len(terminal)} terminal sessions from registry")

                # Periodically clean up orphaned VBox processes
                if self._services:
                    try:
                        self._services.vm_service.cleanup_orphaned_vbox_processes(kill_all=False)
                    except Exception:
                        pass
            except asyncio.CancelledError:
                break
            except Exception:
                pass

    def initialize(self) -> None:
        """Initialize the runtime service."""
        self._settings = load_settings()
        self._logger = configure_logging(self._settings)
        self._logger.info("Initializing Sandbox Runtime API service")

        self._add_log("INFO", "Sandbox Runtime API starting...")
        self._add_log("INFO", f"Version: 1.0.0")
        self._add_log("INFO", f"Platform: Windows")

        self._services = ServiceRegistry.bootstrap(
            settings=self._settings,
            logger=self._logger
        )

        self._services.session_orchestrator.initialize_session_context()
        self._add_log("INFO", "Service registry initialized")
        self._add_log("INFO", "Sandbox Runtime API initialized successfully")

    def _add_log(self, level: str, message: str, session_id: Optional[str] = None) -> None:
        """Add a log entry to the runtime log buffer and enqueue for system log broadcast."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            "session_id": session_id,
            "source": "runtime",
        }
        self._runtime_logs.append(log_entry)
        if self._logger:
            if level == "ERROR":
                self._logger.error(message)
            elif level == "WARNING":
                self._logger.warning(message)
            else:
                self._logger.info(message)

        try:
            self._system_log_queue.put_nowait(log_entry)
        except asyncio.QueueFull:
            pass

    async def start_telemetry_processor(self) -> None:
        """Start the background telemetry processor."""
        async def process_telemetry():
            while True:
                try:
                    event = await self._telemetry_queue.get()
                    await self._broadcast_telemetry(event)
                except Exception as e:
                    self._logger.error(f"Telemetry processing error: {e}")

        self._telemetry_task = asyncio.create_task(process_telemetry())

    async def start_system_log_processor(self) -> None:
        """Start the background system log processor."""
        async def process_system_logs():
            while True:
                try:
                    log_entry = await self._system_log_queue.get()
                    await self._broadcast_system_log(log_entry)
                except Exception as e:
                    self._logger.error(f"System log processing error: {e}")

        self._system_log_task = asyncio.create_task(process_system_logs())

    async def stop_telemetry_processor(self) -> None:
        """Stop the telemetry processor."""
        if self._telemetry_task:
            self._telemetry_task.cancel()
            try:
                await self._telemetry_task
            except asyncio.CancelledError:
                pass

    async def stop_system_log_processor(self) -> None:
        """Stop the system log processor."""
        if self._system_log_task:
            self._system_log_task.cancel()
            try:
                await self._system_log_task
            except asyncio.CancelledError:
                pass

    async def _safe_send(self, client: WebSocket, data: dict) -> None:
        """Safely send data to a WebSocket client with timeout."""
        try:
            await asyncio.wait_for(client.send_json(data), timeout=5.0)
        except Exception:
            pass

    async def _broadcast_telemetry(self, event: dict) -> None:
        """Broadcast forensic telemetry to all connected clients concurrently."""
        dead = set()
        tasks = [self._safe_send(client, event) for client in list(self._telemetry_clients)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for client, result in zip(list(self._telemetry_clients), results):
            if isinstance(result, Exception):
                dead.add(client)
        for client in dead:
            self._telemetry_clients.discard(client)

    async def _broadcast_system_log(self, log_entry: dict) -> None:
        """Broadcast system/operational log to all connected log clients concurrently."""
        dead = set()
        tasks = [self._safe_send(client, log_entry) for client in list(self._system_log_clients)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for client, result in zip(list(self._system_log_clients), results):
            if isinstance(result, Exception):
                dead.add(client)
        for client in dead:
            self._system_log_clients.discard(client)

    async def stream_telemetry(self, session_id: str, event: ForensicEvent) -> None:
        """Stream a telemetry event to connected clients."""
        event_data = self._build_telemetry_event(session_id, event)
        await self._telemetry_queue.put(event_data)

    def enqueue_telemetry(self, session_id: str, event: ForensicEvent) -> None:
        """Synchronously enqueue a telemetry event for broadcast (thread-safe).

        This is the synchronous counterpart of stream_telemetry, designed to be
        called from background threads (e.g. monitoring coordinators, pollers).
        """
        try:
            event_data = self._build_telemetry_event(session_id, event)
            self._telemetry_queue.put_nowait(event_data)
        except asyncio.QueueFull:
            pass
        except Exception:
            pass

    def _build_telemetry_event(self, session_id: str, event: ForensicEvent) -> dict:
        """Build the telemetry event dict from a ForensicEvent."""
        return {
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "event_type": "forensic_event",
            "category": event.category.value if hasattr(event.category, 'value') else str(event.category),
            "data": event.to_dict() if hasattr(event, 'to_dict') else {"raw": str(event)},
        }

    async def stream_session_update(self, session_id: str, state: SessionState, data: dict) -> None:
        """Stream a session state update to the system log channel (NOT telemetry)."""
        state_messages = {
            SessionState.RESTORING_SNAPSHOT: "Restoring VM snapshot",
            SessionState.BOOTING_VM: "Starting VM",
            SessionState.EXECUTING: "Executing simulator",
            SessionState.MONITORING: "Monitoring active",
            SessionState.ANALYZING: "Analyzing results",
            SessionState.ROLLING_BACK: "Rolling back VM",
            SessionState.COMPLETED: "Session completed",
            SessionState.FAILED: "Session failed",
        }
        message = data.get("message", state_messages.get(state, f"State: {state.value}"))
        log_level = "ERROR" if state == SessionState.FAILED else "INFO"

        self._add_log(log_level, message, session_id)

    async def connect_telemetry_websocket(self, websocket: WebSocket) -> None:
        """Register a WebSocket client for forensic telemetry streaming."""
        if len(self._telemetry_clients) >= 50:
            await websocket.close(code=1013)
            self._logger.warning("Telemetry WS client rejected: max clients (50) reached")
            return
        self._telemetry_clients.add(websocket)
        self._logger.info(f"Telemetry WS client connected. Total: {len(self._telemetry_clients)}")

    async def disconnect_telemetry_websocket(self, websocket: WebSocket) -> None:
        """Handle telemetry WebSocket disconnection."""
        self._telemetry_clients.discard(websocket)
        self._logger.info(f"Telemetry WS client disconnected. Total: {len(self._telemetry_clients)}")

    async def connect_system_log_websocket(self, websocket: WebSocket) -> None:
        """Register a WebSocket client for system/operational log streaming."""
        if len(self._system_log_clients) >= 50:
            await websocket.close(code=1013)
            self._logger.warning("System log WS client rejected: max clients (50) reached")
            return
        self._system_log_clients.add(websocket)
        self._logger.info(f"System log WS client connected. Total: {len(self._system_log_clients)}")

    async def disconnect_system_log_websocket(self, websocket: WebSocket) -> None:
        """Handle system log WebSocket disconnection."""
        self._system_log_clients.discard(websocket)
        self._logger.info(f"System log WS client disconnected. Total: {len(self._system_log_clients)}")

    def get_health(self) -> HealthResponse:
        """Get service health status."""
        vm_info = {}
        try:
            if self._services:
                vm_info = self._services.vm_service.get_vm_info()
        except Exception as e:
            vm_info = {"error": str(e)}

        uptime = (datetime.now() - self._start_time).total_seconds()

        return HealthResponse(
            status="healthy",
            version="1.0.0",
            uptime_seconds=uptime,
            vm_status=vm_info,
            active_sessions=len([s for s in self._sessions.values() if s.state not in (SessionState.COMPLETED, SessionState.FAILED)]),
            telemetry_connections=len(self._telemetry_clients),
        )

    async def start_session(self, request: StartSessionRequest) -> SessionResponse:
        """Start a new sandbox execution session."""
        session_id = str(uuid.uuid4())
        now = datetime.now()

        self._add_log("INFO", f"=== Starting New Session: {session_id} ===")
        self._add_log("INFO", f"Simulator: {request.simulator_id}")
        self._add_log("INFO", f"Auto-rollback: {request.auto_rollback}")
        self._add_log("INFO", f"Timeout: {request.timeout_seconds}s")

        runtime_session = RuntimeSession(
            session_id=session_id,
            state=SessionState.INITIALIZING,
            simulator_id=request.simulator_id,
            created_at=now,
            updated_at=now,
        )
        self._sessions[session_id] = runtime_session

        async def run_with_timeout():
            try:
                await asyncio.wait_for(
                    self._run_session(runtime_session, request),
                    timeout=request.timeout_seconds + 30,
                )
            except asyncio.TimeoutError:
                self._add_log("ERROR", f"Session {session_id} timed out after {request.timeout_seconds}s")
                runtime_session.state = SessionState.FAILED
                runtime_session.error = f"Session timed out after {request.timeout_seconds}s"
                runtime_session.updated_at = datetime.now()
                await self.stream_session_update(session_id, SessionState.FAILED, {
                    "message": "Session timed out",
                    "error": f"Exceeded {request.timeout_seconds}s limit",
                })
            except Exception as e:
                self._add_log("ERROR", f"Session {session_id} failed: {e}")
                runtime_session.state = SessionState.FAILED
                runtime_session.error = str(e)
                runtime_session.updated_at = datetime.now()
                await self.stream_session_update(session_id, SessionState.FAILED, {
                    "message": "Session failed",
                    "error": str(e),
                })

        asyncio.create_task(run_with_timeout())

        return SessionResponse(
            session_id=runtime_session.session_id,
            state=runtime_session.state,
            simulator_id=runtime_session.simulator_id,
            created_at=runtime_session.created_at.isoformat(),
            updated_at=runtime_session.updated_at.isoformat(),
            error=runtime_session.error,
        )

    async def _run_session(self, runtime_session: RuntimeSession, request: StartSessionRequest) -> None:
        """Run the blocking VM execution pipeline without blocking the API."""
        session_id = runtime_session.session_id

        try:
            self._add_log("INFO", "Preparing environment...")

            runtime_session.state = SessionState.RESTORING_SNAPSHOT
            runtime_session.updated_at = datetime.now()
            await self.stream_session_update(session_id, SessionState.RESTORING_SNAPSHOT, {"message": "Preparing VM for execution"})
            self._add_log("INFO", "VM lifecycle managed by execution pipeline")

            runtime_session.state = SessionState.EXECUTING
            runtime_session.updated_at = datetime.now()
            await self.stream_session_update(session_id, SessionState.EXECUTING, {"message": "Starting simulator execution"})
            self._add_log("INFO", f"Loading simulator: {request.simulator_id}")

            simulator = next(
                (s for s in self._services.simulator_catalog.get_all_simulators() if s.id == request.simulator_id),
                None
            )

            if not simulator:
                raise ValueError(f"Simulator not found: {request.simulator_id}")

            self._add_log("INFO", f"Simulator loaded: {simulator.display_name}")
            self._add_log("INFO", "Starting forensic monitoring...")
            self._add_log("INFO", "  - Process monitoring: ACTIVE")
            self._add_log("INFO", "  - File system monitoring: ACTIVE")
            self._add_log("INFO", "  - Registry monitoring: ACTIVE")
            self._add_log("INFO", "  - Network monitoring: ACTIVE")

            self._add_log("INFO", "Executing simulator...")
            forensic_session = await asyncio.to_thread(
                self._services.session_orchestrator.execute_simulator,
                simulator=simulator,
                auto_rollback=request.auto_rollback,
                session_id=session_id,
            )

            runtime_session.forensic_session = forensic_session
            runtime_session.updated_at = datetime.now()

            coordinator = getattr(self._services, "monitoring_coordinator", None)
            if coordinator:
                raw_events = coordinator.get_events()
                runtime_session.events = [
                    e.to_dict() if hasattr(e, 'to_dict') else {"raw": str(e)}
                    for e in raw_events
                ]
                self._add_log("INFO", f"Captured {len(runtime_session.events)} forensic events")

            fs_status = forensic_session.status.value if forensic_session else "failed"
            fs_exit_code = forensic_session.exit_code if forensic_session else 0
            metadata = forensic_session.metadata if forensic_session else {}
            total_events = metadata.get("monitoring_summary", {}).get("total_events", 0)
            is_failed = fs_status in ("failed", "timeout")

            runtime_session.state = SessionState.FAILED if is_failed else SessionState.COMPLETED

            self._add_log("INFO", f"Simulator execution completed (exit code: {fs_exit_code})")
            self._add_log("INFO", f"Total events collected: {total_events}")

            target_state = SessionState.FAILED if is_failed else SessionState.COMPLETED
            await self.stream_session_update(session_id, target_state, {
                "message": "Session completed",
                "status": fs_status,
                "exit_code": fs_exit_code,
                "total_events": total_events,
            })

            self._add_log("INFO", "=== Session Finished ===")

        except Exception as e:
            self._add_log("ERROR", f"Session failed: {str(e)}")
            runtime_session.state = SessionState.FAILED
            runtime_session.error = str(e)
            runtime_session.updated_at = datetime.now()

            await self.stream_session_update(session_id, SessionState.FAILED, {
                "message": "Session failed",
                "error": str(e),
            })

    def get_session(self, session_id: str) -> SessionResponse:
        """Get session status."""
        session = self._sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        return SessionResponse(
            session_id=session.session_id,
            state=session.state,
            simulator_id=session.simulator_id,
            created_at=session.created_at.isoformat(),
            updated_at=session.updated_at.isoformat(),
            error=session.error,
        )

    def get_session_events(self, session_id: str) -> list[dict]:
        """Get events for a completed session."""
        session = self._sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session.events

    def get_all_sessions(self) -> list[SessionResponse]:
        """Get all sessions."""
        return [
            SessionResponse(
                session_id=s.session_id,
                state=s.state,
                simulator_id=s.simulator_id,
                created_at=s.created_at.isoformat(),
                updated_at=s.updated_at.isoformat(),
                error=s.error,
            )
            for s in self._sessions.values()
        ]

    async def stop_session(self, session_id: str, force: bool = False) -> SessionResponse:
        """Stop an active session."""
        session = self._sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        self._add_log("WARNING", f"=== Session Stop Requested: {session_id} ===")
        self._add_log("INFO", f"Force stop: {force}")

        try:
            if force and self._services:
                self._add_log("WARNING", "Force stopping VM...")
                self._services.vm_service.stop_vm(force=True)
                self._add_log("INFO", "VM force stopped")
                self._services.vm_service.cleanup_orphaned_vbox_processes(kill_all=True)
                self._add_log("INFO", "Orphaned VBox processes cleaned up")
            coordinator = getattr(self._services, "monitoring_coordinator", None) if self._services else None
            if coordinator and getattr(coordinator, "_is_active", False):
                coordinator.stop_monitoring()
                self._add_log("INFO", "Forensic monitoring stopped")
        except Exception as e:
            self._add_log("WARNING", f"Error during force stop: {str(e)}")

        session.state = SessionState.FAILED
        session.error = "Session stopped by user"
        session.updated_at = datetime.now()

        await self.stream_session_update(session_id, SessionState.ROLLING_BACK, {
            "message": "Rolling back VM to clean state",
        })
        self._add_log("INFO", "Initiating VM rollback...")

        try:
            if self._services:
                self._services.session_orchestrator.restore_snapshot()
            self._add_log("INFO", "Snapshot restored successfully")
            await self.stream_session_update(session_id, SessionState.FAILED, {
                "message": "Session terminated and rolled back",
            })
            self._add_log("INFO", "=== Session Terminated ===")
        except Exception as e:
            self._add_log("ERROR", f"Rollback failed: {str(e)}")
            await self.stream_session_update(session_id, SessionState.FAILED, {
                "message": "Session terminated, rollback failed",
                "error": str(e),
            })

        return SessionResponse(
            session_id=session.session_id,
            state=session.state,
            simulator_id=session.simulator_id,
            created_at=session.created_at.isoformat(),
            updated_at=session.updated_at.isoformat(),
            error=session.error,
        )

    async def reset_vm(self) -> dict:
        """Reset the VM to clean snapshot."""
        self._add_log("INFO", "=== VM Reset Requested ===")
        self._add_log("INFO", "Stopping VM if running...")

        try:
            coordinator = getattr(self._services, "monitoring_coordinator", None)
            if coordinator and getattr(coordinator, "_is_active", False):
                coordinator.stop_monitoring()
                self._add_log("INFO", "Forensic monitoring stopped")
            self._add_log("INFO", "Restoring VM to CleanBaseline snapshot...")
            self._services.session_orchestrator.restore_snapshot()
            self._add_log("INFO", "Snapshot restored successfully")
            self._add_log("INFO", "VM reset complete")
            self._add_log("INFO", "=== VM Ready for New Session ===")
            return {"status": "success", "message": "VM reset to clean snapshot"}
        except Exception as e:
            self._add_log("ERROR", f"VM reset failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"VM reset failed: {str(e)}")

    def get_logs(self, limit: int = 100, level: Optional[str] = None) -> list[dict]:
        """Get runtime logs."""
        logs = list(self._runtime_logs)

        if level:
            logs = [log for log in logs if log.get("level", "").upper() == level.upper()]

        return logs[-limit:]

    def get_vm_status(self) -> dict:
        """Get current VM status."""
        try:
            vm_info = self._services.vm_service.get_vm_info()
            orchestrator_status = self._services.session_orchestrator.get_monitoring_status()
            return {
                **vm_info,
                "monitoring": orchestrator_status,
            }
        except Exception as e:
            return {"error": str(e)}

    def get_monitoring_summary(self) -> dict:
        """Get monitoring status summary."""
        try:
            coordinator = self._services.monitoring_coordinator
            if coordinator:
                return coordinator.get_monitor_status()
            return {"enabled": False}
        except Exception as e:
            return {"error": str(e), "enabled": False}

    def get_execution_status(self) -> dict:
        """Get execution status and history."""
        try:
            orchestrator = self._services.session_orchestrator
            history = orchestrator.get_execution_history()
            current = orchestrator.get_current_session()
            return {
                "history_count": len(history),
                "current_session": current.to_dict() if current else None,
                "recent_sessions": [
                    {"session_id": s.session_id, "status": s.status.value, "simulator_id": s.simulator_id}
                    for s in history[-10:]
                ],
            }
        except Exception as e:
            return {"error": str(e)}

    def get_simulators(self) -> list[dict]:
        """Get available simulators."""
        return [
            {
                "id": s.id,
                "display_name": s.display_name,
                "description": s.description,
                "category": s.category.value if hasattr(s.category, 'value') else str(s.category),
            }
            for s in self._services.simulator_catalog.get_all_simulators()
        ]


_runtime_api: Optional[SandboxRuntimeAPI] = None


def get_runtime_api() -> SandboxRuntimeAPI:
    """Get the global runtime API instance."""
    global _runtime_api
    if _runtime_api is None:
        _runtime_api = SandboxRuntimeAPI()
    return _runtime_api


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    runtime_api = get_runtime_api()
    runtime_api.initialize()
    await runtime_api.start_telemetry_processor()
    await runtime_api.start_system_log_processor()
    runtime_api._cleanup_task = asyncio.create_task(runtime_api._cleanup_loop())
    runtime_api._heartbeat_task = asyncio.create_task(runtime_api._heartbeat_loop())

    yield

    if runtime_api._heartbeat_task:
        runtime_api._heartbeat_task.cancel()
        try:
            await runtime_api._heartbeat_task
        except asyncio.CancelledError:
            pass
    if runtime_api._cleanup_task:
        runtime_api._cleanup_task.cancel()
        try:
            await runtime_api._cleanup_task
        except asyncio.CancelledError:
            pass
    await runtime_api.stop_telemetry_processor()
    await runtime_api.stop_system_log_processor()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Forensics Sandbox Runtime API",
        description="Headless sandbox execution service for remote malware analysis",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Shared-secret authentication.
    # - If SANDBOX_AGENT_SECRET is set: strictly enforce X-Agent-Secret header.
    # - If unset (dev mode): allow localhost-only requests with a warning.
    @app.middleware("http")
    async def verify_agent_secret(request: FastAPIRequest, call_next):
        # Allow health endpoint without auth for probes
        if request.url.path == "/health":
            return await call_next(request)

        secret = os.environ.get("SANDBOX_AGENT_SECRET", "")

        if not secret:
            # Dev mode: only allow loopback connections
            client_host = request.client.host if request.client else ""
            if client_host in ("127.0.0.1", "::1", "localhost"):
                return await call_next(request)
            return JSONResponse(
                status_code=503,
                content={"detail": "Agent auth not configured. Set SANDBOX_AGENT_SECRET environment variable."},
            )

        # Production mode: require matching secret
        provided = request.headers.get("x-agent-secret", "")
        if provided != secret:
            return JSONResponse(status_code=401, content={"detail": "Invalid agent credentials"})
        return await call_next(request)

    runtime_api = get_runtime_api()

    @app.get("/health", response_model=HealthResponse)
    async def health():
        return runtime_api.get_health()

    @app.get("/simulators")
    async def list_simulators():
        return runtime_api.get_simulators()

    @app.post("/sessions/start", response_model=SessionResponse)
    async def start_session(request: StartSessionRequest):
        return await runtime_api.start_session(request)

    @app.get("/sessions")
    async def list_sessions():
        return runtime_api.get_all_sessions()

    @app.get("/sessions/{session_id}", response_model=SessionResponse)
    async def get_session(session_id: str):
        return runtime_api.get_session(session_id)

    @app.get("/sessions/{session_id}/events")
    async def get_session_events(session_id: str):
        return {"events": runtime_api.get_session_events(session_id)}

    @app.post("/sessions/{session_id}/stop", response_model=SessionResponse)
    async def stop_session(session_id: str):
        return await runtime_api.stop_session(session_id)

    @app.post("/sessions/{session_id}/terminate", response_model=SessionResponse)
    async def terminate_session(session_id: str):
        return await runtime_api.stop_session(session_id, force=True)

    @app.post("/vm/reset")
    async def reset_vm():
        return await runtime_api.reset_vm()

    @app.get("/vm/status")
    async def get_vm_status():
        return runtime_api.get_vm_status()

    @app.get("/monitoring/status")
    async def get_monitoring_status():
        return runtime_api.get_monitoring_summary()

    @app.get("/execution/status")
    async def get_execution_status():
        return runtime_api.get_execution_status()

    @app.get("/logs")
    async def get_logs(limit: int = 100, level: Optional[str] = None):
        return {"logs": runtime_api.get_logs(limit, level)}

    @app.websocket("/telemetry/live")
    async def telemetry_websocket(websocket: WebSocket):
        try:
            await websocket.accept()
        except RuntimeError:
            return
        await runtime_api.connect_telemetry_websocket(websocket)
        try:
            async for _ in websocket.iter_text():
                pass
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            await runtime_api.disconnect_telemetry_websocket(websocket)

    @app.websocket("/logs/live")
    async def system_log_websocket(websocket: WebSocket):
        try:
            await websocket.accept()
        except RuntimeError:
            return
        await runtime_api.connect_system_log_websocket(websocket)
        try:
            for log_entry in list(runtime_api._runtime_logs)[-50:]:
                try:
                    await websocket.send_json(log_entry)
                except Exception:
                    break
            async for _ in websocket.iter_text():
                pass
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            await runtime_api.disconnect_system_log_websocket(websocket)

    return app


def run_server(host: str = "127.0.0.1", port: int = 8765) -> None:
    """Run the FastAPI server with retry on port conflict."""
    import subprocess
    import uvicorn

    no_window = subprocess.CREATE_NO_WINDOW if os.name == "nt" and hasattr(subprocess, "CREATE_NO_WINDOW") else 0

    try:
        result = subprocess.run(
            ["netstat", "-ano"], capture_output=True, text=True, timeout=10, creationflags=no_window,
        )
        for line in result.stdout.splitlines():
            if f"{host}:{port}" in line and "LISTENING" in line:
                parts = line.strip().split()
                pid = parts[-1]
                if pid and pid != "0":
                    subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True, timeout=5, creationflags=no_window)
    except Exception:
        pass

    app = create_app()
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            uvicorn.run(app, host=host, port=port)
            return
        except OSError as e:
            if "bind" in str(e).lower() and attempt < max_retries:
                import time
                time.sleep(2)
            else:
                raise


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Forensic Sandbox Runtime API")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    args = parser.parse_args()
    run_server(host=args.host, port=args.port)
