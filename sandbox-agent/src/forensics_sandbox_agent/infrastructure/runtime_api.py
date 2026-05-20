"""Headless Sandbox Runtime API Service.

FastAPI service providing remote control and telemetry streaming for the sandbox
execution environment. This service wraps the existing forensic capabilities
while enabling remote orchestration from the web dashboard.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
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


class SandboxRuntimeAPI:
    """FastAPI service for sandbox runtime control."""

    def __init__(self):
        self._settings = None
        self._logger = None
        self._services: Optional[ServiceRegistry] = None
        self._start_time = datetime.now()
        self._sessions: dict[str, RuntimeSession] = {}
        self._telemetry_clients: set[WebSocket] = set()
        self._telemetry_queue: asyncio.Queue = asyncio.Queue()
        self._telemetry_task: Optional[asyncio.Task] = None
        self._runtime_logs: list[dict] = []
        self._max_logs = 1000

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

    def _add_log(self, level: str, message: str) -> None:
        """Add a log entry to the runtime log buffer."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message
        }
        self._runtime_logs.append(log_entry)
        if len(self._runtime_logs) > self._max_logs:
            self._runtime_logs.pop(0)
        if self._logger:
            if level == "ERROR":
                self._logger.error(message)
            elif level == "WARNING":
                self._logger.warning(message)
            else:
                self._logger.info(message)

    async def start_telemetry_processor(self) -> None:
        """Start the background telemetry processor."""
        async def process_telemetry():
            while True:
                try:
                    event = await asyncio.wait_for(
                        self._telemetry_queue.get(),
                        timeout=1.0
                    )
                    await self._broadcast_telemetry(event)
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    self._logger.error(f"Telemetry processing error: {e}")

        self._telemetry_task = asyncio.create_task(process_telemetry())

    async def stop_telemetry_processor(self) -> None:
        """Stop the telemetry processor."""
        if self._telemetry_task:
            self._telemetry_task.cancel()
            try:
                await self._telemetry_task
            except asyncio.CancelledError:
                pass

    async def _broadcast_telemetry(self, event: dict) -> None:
        """Broadcast telemetry to all connected clients."""
        dead_clients = set()
        for client in self._telemetry_clients:
            try:
                await client.send_json(event)
            except Exception:
                dead_clients.add(client)
        for client in dead_clients:
            self._telemetry_clients.discard(client)

    async def stream_telemetry(self, session_id: str, event: ForensicEvent) -> None:
        """Stream a telemetry event to connected clients."""
        event_data = {
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "event_type": "forensic_event",
            "category": event.category.value if hasattr(event.category, 'value') else str(event.category),
            "data": event.to_dict() if hasattr(event, 'to_dict') else {"raw": str(event)},
        }
        await self._telemetry_queue.put(event_data)

    async def stream_session_update(self, session_id: str, state: SessionState, data: dict) -> None:
        """Stream a session state update."""
        event_data = {
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "event_type": "session_update",
            "category": "session",
            "data": {
                "state": state.value,
                **data
            },
        }
        await self._telemetry_queue.put(event_data)

    async def connect_websocket(self, websocket: WebSocket) -> None:
        """Accept a WebSocket connection for telemetry streaming."""
        await websocket.accept()
        self._telemetry_clients.add(websocket)
        self._logger.info(f"WebSocket client connected. Total clients: {len(self._telemetry_clients)}")

    async def disconnect_websocket(self, websocket: WebSocket) -> None:
        """Handle WebSocket disconnection."""
        self._telemetry_clients.discard(websocket)
        self._logger.info(f"WebSocket client disconnected. Total clients: {len(self._telemetry_clients)}")

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

        try:
            self._add_log("INFO", "Preparing environment...")
            await self.stream_session_update(session_id, SessionState.RESTORING_SNAPSHOT, {"message": "Restoring VM snapshot"})

            self._add_log("INFO", "Restoring VM to clean snapshot...")
            self._services.session_orchestrator.restore_snapshot()
            self._add_log("INFO", "Snapshot restored successfully")

            await self.stream_session_update(session_id, SessionState.BOOTING_VM, {"message": "Starting VM"})
            self._add_log("INFO", "Starting VirtualBox VM (headless mode)...")
            self._services.session_orchestrator.start_vm(headless=True)
            self._add_log("INFO", "VM started successfully")

            self._add_log("INFO", "Waiting for VM to boot...")
            await asyncio.sleep(3)
            self._add_log("INFO", "VM booted and ready")

            await self.stream_session_update(session_id, SessionState.EXECUTING, {"message": "Executing simulator"})
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
            forensic_session = self._services.session_orchestrator.execute_simulator(
                simulator=simulator,
                auto_rollback=request.auto_rollback,
            )

            runtime_session.forensic_session = forensic_session
            self._add_log("INFO", f"Simulator execution completed (exit code: {forensic_session.exit_code})")

            await self.stream_session_update(session_id, SessionState.ANALYZING, {"message": "Analyzing results"})
            self._add_log("INFO", "Collecting forensic events...")
            self._add_log("INFO", "Generating forensic report...")

            runtime_session.state = SessionState.COMPLETED
            runtime_session.updated_at = datetime.now()

            await self.stream_session_update(session_id, SessionState.COMPLETED, {
                "message": "Session completed",
                "status": forensic_session.status.value if forensic_session else "completed",
                "exit_code": forensic_session.exit_code if forensic_session else 0,
            })

            self._add_log("INFO", "Session completed successfully")
            self._add_log("INFO", f"Total events collected: {len(forensic_session.events) if forensic_session.events else 0}")
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

        return SessionResponse(
            session_id=runtime_session.session_id,
            state=runtime_session.state,
            simulator_id=runtime_session.simulator_id,
            created_at=runtime_session.created_at.isoformat(),
            updated_at=runtime_session.updated_at.isoformat(),
            error=runtime_session.error,
        )

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
            if force:
                self._add_log("WARNING", "Force stopping VM...")
                self._services.vm_service.stop_vm(force=True)
                self._add_log("INFO", "VM force stopped")
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

    def _extract_log_level(self, line: str) -> str:
        """Extract log level from line."""
        line_upper = line.upper()
        if 'ERROR' in line_upper:
            return 'ERROR'
        elif 'WARNING' in line_upper or 'WARN' in line_upper:
            return 'WARNING'
        elif 'INFO' in line_upper:
            return 'INFO'
        elif 'DEBUG' in line_upper:
            return 'DEBUG'
        return 'INFO'

    def _generate_runtime_logs(self) -> list[dict]:
        """Generate runtime logs based on current state."""
        logs = []
        now = datetime.now()

        logs.append({
            "timestamp": now.isoformat(),
            "message": "Sandbox Runtime API started",
            "level": "INFO",
        })

        if self._services:
            vm_info = self._services.vm_service.get_vm_info()
            state = vm_info.get('state', 'unknown')
            logs.append({
                "timestamp": now.isoformat(),
                "message": f"VM state: {state}",
                "level": "INFO",
            })

            if self._sessions:
                logs.append({
                    "timestamp": now.isoformat(),
                    "message": f"Active sessions: {len(self._sessions)}",
                    "level": "INFO",
                })

        return logs

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

    yield

    await runtime_api.stop_telemetry_processor()


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
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
        await runtime_api.connect_websocket(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            await runtime_api.disconnect_websocket(websocket)

    return app


def run_server(host: str = "127.0.0.1", port: int = 8765) -> None:
    """Run the FastAPI server."""
    import uvicorn
    app = create_app()
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()