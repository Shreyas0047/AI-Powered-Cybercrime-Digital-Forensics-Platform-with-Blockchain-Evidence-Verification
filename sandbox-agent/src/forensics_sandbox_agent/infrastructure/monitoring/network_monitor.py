"""Network Observation Service - passive network activity monitoring."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass
from collections import defaultdict

from forensics_sandbox_agent.app.config.monitoring_models import NetworkMonitoringConfig
from forensics_sandbox_agent.infrastructure.monitoring.event_pipeline import ForensicEventPipeline
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    EventOperation,
    SuspiciousIndicator,
)


@dataclass
class NetworkConnection:
    """Record of a network connection."""
    destination_ip: str
    destination_port: Optional[int]
    protocol: str
    direction: str
    source_pid: Optional[int]
    timestamp: datetime
    dns_query: Optional[str] = None


class NetworkObserver:
    """Observes network activity in the sandbox."""

    def __init__(
        self,
        config: NetworkMonitoringConfig,
        pipeline: ForensicEventPipeline,
        logger: logging.Logger,
    ) -> None:
        self._config = config
        self._pipeline = pipeline
        self._logger = logger
        self._connections: list[NetworkConnection] = []
        self._connections_per_minute: list[datetime] = []
        self._is_active = False

    def start(self) -> None:
        """Start network monitoring."""
        self._is_active = True
        self._connections.clear()
        self._connections_per_minute.clear()
        self._logger.info("Network observation started")

    def stop(self) -> None:
        """Stop network monitoring."""
        self._is_active = False
        self._logger.info(f"Network observation stopped - tracked {len(self._connections)} connections")

    def record_connection(
        self,
        destination_ip: str,
        destination_port: Optional[int],
        protocol: str = "TCP",
        source_pid: Optional[int] = None,
    ) -> None:
        """Record an outbound connection."""
        if not self._is_active:
            return

        suspicious = self._check_suspicious_connection(destination_port, destination_ip)

        connection = NetworkConnection(
            destination_ip=destination_ip,
            destination_port=destination_port,
            protocol=protocol,
            direction="outbound",
            source_pid=source_pid,
            timestamp=datetime.now(),
        )
        self._connections.append(connection)
        self._connections_per_minute.append(datetime.now())

        self._pipeline.emit_network_event(
            operation=EventOperation.NETWORK_CONNECT,
            destination_ip=destination_ip,
            destination_port=destination_port,
            protocol=protocol,
            source_pid=source_pid,
            suspicious_indicators=suspicious,
        )

        self._logger.debug(f"Network connection: {destination_ip}:{destination_port}")

    def record_dns_query(
        self,
        query: str,
        source_pid: Optional[int] = None,
    ) -> None:
        """Record a DNS query."""
        if not self._is_active or not self._config.track_dns:
            return

        connection = NetworkConnection(
            destination_ip="",
            destination_port=None,
            protocol="DNS",
            direction="outbound",
            source_pid=source_pid,
            timestamp=datetime.now(),
            dns_query=query,
        )
        self._connections.append(connection)

        self._pipeline.emit_network_event(
            operation=EventOperation.NETWORK_DNS_QUERY,
            dns_query=query,
            source_pid=source_pid,
        )

        self._logger.debug(f"DNS query: {query}")

    def record_listen(
        self,
        port: int,
        protocol: str = "TCP",
        source_pid: Optional[int] = None,
    ) -> None:
        """Record a listening port."""
        if not self._is_active or not self._config.track_connections:
            return

        connection = NetworkConnection(
            destination_ip="0.0.0.0",
            destination_port=port,
            protocol=protocol,
            direction="listen",
            source_pid=source_pid,
            timestamp=datetime.now(),
        )
        self._connections.append(connection)

        self._pipeline.emit_network_event(
            operation=EventOperation.NETWORK_LISTEN,
            destination_port=port,
            protocol=protocol,
            source_pid=source_pid,
        )

        self._logger.debug(f"Port listening: {port}/{protocol}")

    def _check_suspicious_connection(
        self,
        port: Optional[int],
        ip: str,
    ) -> list[SuspiciousIndicator]:
        """Check for suspicious connection patterns."""
        if not self._config.max_connections_per_minute:
            return []

        now = datetime.now()
        recent_connections = [
            t for t in self._connections_per_minute
            if (now - t).total_seconds() < 60
        ]

        if len(recent_connections) > self._config.max_connections_per_minute:
            return [SuspiciousIndicator.SUSPICIOUS_NETWORK]

        if port in self._config.suspicious_ports:
            return [SuspiciousIndicator.SUSPICIOUS_NETWORK]

        return []

    def get_recent_connections(self, count: int = 50) -> list[NetworkConnection]:
        """Get recent network connections."""
        sorted_conns = sorted(self._connections, key=lambda x: x.timestamp, reverse=True)
        return sorted_conns[:count]

    def get_connections_by_protocol(self) -> dict[str, int]:
        """Get connection counts by protocol."""
        counts = defaultdict(int)
        for conn in self._connections:
            counts[conn.protocol] += 1
        return dict(counts)

    def get_unique_destinations(self) -> list[str]:
        """Get unique destination IPs."""
        return list(set(
            conn.destination_ip for conn in self._connections
            if conn.destination_ip
        ))

    def get_network_summary(self) -> dict:
        """Get network monitoring summary."""
        return {
            "total_connections": len(self._connections),
            "connections_by_protocol": self.get_connections_by_protocol(),
            "unique_destinations": len(self.get_unique_destinations()),
        }