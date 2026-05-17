"""Typed configuration models for the desktop agent."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from forensics_sandbox_agent.app.config.execution_models import (
    ExecutionPolicyConfig,
)
from forensics_sandbox_agent.app.config.monitoring_models import MonitoringConfig


@dataclass(slots=True)
class ApplicationSection:
    name: str
    version: str
    environment: str
    theme: str


@dataclass(slots=True)
class PathSection:
    logs_dir: Path
    exports_dir: Path
    simulator_catalog_dir: Path


@dataclass(slots=True)
class LoggingSection:
    level: str
    file_name: str
    format: str
    categories: list[str]


@dataclass(slots=True)
class VmSection:
    provider: str
    require_vm_marker: bool
    vm_marker_file: str
    snapshot_name: str


@dataclass(slots=True)
class ReportingSection:
    schema_version: str
    default_export_format: str


@dataclass(slots=True)
class FutureIntegrationsSection:
    api_base_url: str
    upload_enabled: bool


@dataclass(slots=True)
class AppSettings:
    application: ApplicationSection
    paths: PathSection
    logging: LoggingSection
    vm: VmSection
    reporting: ReportingSection
    future_integrations: FutureIntegrationsSection
    execution_policy: ExecutionPolicyConfig = field(default_factory=ExecutionPolicyConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
