"""Configuration loader with YAML/JSON support.

The agent starts with YAML as the default operator-facing format because it is
readable for desktop deployment scenarios. JSON is accepted as a future-safe
fallback for tooling compatibility.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml

from forensics_sandbox_agent.app.config.execution_models import (
    SandboxExecutionConfig,
    RollbackPolicyConfig,
    IsolationConfig,
    ExecutionPolicyConfig,
)
from forensics_sandbox_agent.app.config.monitoring_models import (
    MonitoringConfig,
    ProcessMonitoringConfig,
    FileMonitoringConfig,
    RegistryMonitoringConfig,
    NetworkMonitoringConfig,
    ForensicStorageConfig,
    BehaviorDetectionConfig,
)
from forensics_sandbox_agent.app.config.models import (
    AppSettings,
    ApplicationSection,
    FutureIntegrationsSection,
    LoggingSection,
    PathSection,
    ReportingSection,
    VmSection,
)


def load_settings(config_path: Path | None = None) -> AppSettings:
    """Load application settings from disk.

    The loader is intentionally strict enough to fail early on missing shape,
    while remaining small until a richer validation layer is added.
    """

    resolved_path = config_path or _default_config_path()
    payload = _read_config(resolved_path)
    base_dir = resolved_path.parent

    execution_policy = _build_execution_policy(payload.get("execution_policy", {}))
    monitoring_config = _build_monitoring_config(payload.get("monitoring", {}), base_dir)

    return AppSettings(
        application=ApplicationSection(**payload["application"]),
        paths=PathSection(
            logs_dir=(base_dir / payload["paths"]["logs_dir"]).resolve(),
            exports_dir=(base_dir / payload["paths"]["exports_dir"]).resolve(),
            simulator_catalog_dir=(base_dir / payload["paths"]["simulator_catalog_dir"]).resolve(),
        ),
        logging=LoggingSection(**payload["logging"]),
        vm=VmSection(**payload["vm"]),
        reporting=ReportingSection(**payload["reporting"]),
        future_integrations=FutureIntegrationsSection(**payload["future_integrations"]),
        execution_policy=execution_policy,
        monitoring=monitoring_config,
    )


def _build_execution_policy(payload: dict[str, Any]) -> ExecutionPolicyConfig:
    """Build execution policy configuration from payload."""
    sandbox_config = payload.get("sandbox_execution", {})
    rollback_config = payload.get("rollback_policy", {})
    isolation_config = payload.get("isolation", {})

    return ExecutionPolicyConfig(
        sandbox_execution=SandboxExecutionConfig(**sandbox_config),
        rollback_policy=RollbackPolicyConfig(**rollback_config),
        isolation=IsolationConfig(**isolation_config),
    )


def _build_monitoring_config(payload: dict[str, Any], base_dir: Path) -> MonitoringConfig:
    """Build monitoring configuration from payload."""
    process_config = payload.get("process", {})
    file_config = payload.get("file_system", {})
    registry_config = payload.get("registry", {})
    network_config = payload.get("network", {})
    storage_config = payload.get("storage", {})
    behavior_config = payload.get("behavior_detection", {})

    storage = storage_config.pop("events_dir", "../../logs/monitoring")
    storage_full_path = (base_dir / storage).resolve()

    return MonitoringConfig(
        process=ProcessMonitoringConfig(**process_config),
        file_system=FileMonitoringConfig(**file_config),
        registry=RegistryMonitoringConfig(**registry_config),
        network=NetworkMonitoringConfig(**network_config),
        storage=ForensicStorageConfig(
            events_dir=storage_full_path,
            **storage_config,
        ),
        behavior_detection=BehaviorDetectionConfig(**behavior_config),
    )


def _default_config_path() -> Path:
    import sys
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller executable - config is in same directory
        bundle_dir = Path(sys.executable).parent
        return bundle_dir / "config" / "default.yaml"
    # Development mode - go from app/config/loader.py up to sandbox-agent
    # Path: sandbox-agent/src/forensics_sandbox_agent/app/config/loader.py
    # parents[4] = sandbox-agent
    return Path(__file__).resolve().parents[4] / "config" / "default.yaml"


def _read_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {path}")

    if path.suffix.lower() in {".yaml", ".yml"}:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    elif path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        raise ValueError(f"Unsupported configuration format: {path.suffix}")

    if not isinstance(data, dict):
        raise ValueError("Top-level configuration payload must be an object.")

    return data
