"""View model for platform settings page."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime


class SettingsViewModel:
    """Manages application settings with persistence."""

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._logger = logging.getLogger(
            "forensics_sandbox_agent.presentation.settings"
        )
        self._settings = runtime.settings
        self._original_settings: dict[str, Any] = {}
        self._local_settings: dict[str, Any] = {}
        self._output = ""
        self._validation_errors: list[str] = []
        self._load_settings()
        self._save_original()

    @property
    def vm_name(self) -> str:
        return self._local_settings.get("vm", {}).get("vm_name", "ForensicsSandbox")

    @property
    def snapshot_name(self) -> str:
        return self._local_settings.get("vm", {}).get("snapshot_name", "CleanBaseline")

    @property
    def startup_timeout(self) -> int:
        return self._local_settings.get("vm", {}).get("startup_timeout", 60)

    @property
    def shutdown_timeout(self) -> int:
        return self._local_settings.get("vm", {}).get("shutdown_timeout", 30)

    @property
    def monitoring_enabled(self) -> bool:
        return self._local_settings.get("monitoring", {}).get("enabled", True)

    @property
    def polling_interval(self) -> int:
        return self._local_settings.get("monitoring", {}).get("polling_interval", 5000)

    @property
    def log_retention_days(self) -> int:
        return self._local_settings.get("monitoring", {}).get("log_retention_days", 30)

    @property
    def log_level(self) -> str:
        return self._local_settings.get("logging", {}).get("level", "info")

    @property
    def execution_timeout(self) -> int:
        return self._local_settings.get("execution", {}).get("timeout", 300)

    @property
    def auto_rollback(self) -> bool:
        return self._local_settings.get("execution", {}).get("auto_rollback", True)

    @property
    def max_concurrent_sessions(self) -> int:
        return self._local_settings.get("execution", {}).get("max_concurrent_sessions", 1)

    @property
    def alerts_enabled(self) -> bool:
        return self._local_settings.get("notifications", {}).get("alerts_enabled", True)

    @property
    def webhook_url(self) -> str:
        return self._local_settings.get("notifications", {}).get("webhook_url", "")

    @property
    def output(self) -> str:
        return self._output

    @property
    def validation_errors(self) -> list[str]:
        return self._validation_errors

    @property
    def has_changes(self) -> bool:
        return self._local_settings != self._original_settings

    def _load_settings(self) -> None:
        try:
            config_path = Path("config/default.json")
            if config_path.exists():
                with open(config_path, "r", encoding="utf-8") as f:
                    self._local_settings = json.load(f)
            else:
                self._local_settings = {}
        except Exception as exc:
            self._logger.warning("Could not load settings file: %s", exc)

    def _save_original(self) -> None:
        self._original_settings = json.loads(json.dumps(self._local_settings))

    def set_vm_name(self, value: str) -> None:
        self._local_settings.setdefault("vm", {})["vm_name"] = value

    def set_snapshot_name(self, value: str) -> None:
        self._local_settings.setdefault("vm", {})["snapshot_name"] = value

    def set_startup_timeout(self, value: int) -> None:
        self._local_settings.setdefault("vm", {})["startup_timeout"] = value

    def set_shutdown_timeout(self, value: int) -> None:
        self._local_settings.setdefault("vm", {})["shutdown_timeout"] = value

    def set_monitoring_enabled(self, value: bool) -> None:
        self._local_settings.setdefault("monitoring", {})["enabled"] = value

    def set_polling_interval(self, value: int) -> None:
        self._local_settings.setdefault("monitoring", {})["polling_interval"] = value

    def set_log_retention_days(self, value: int) -> None:
        self._local_settings.setdefault("monitoring", {})["log_retention_days"] = value

    def set_log_level(self, value: str) -> None:
        self._local_settings.setdefault("logging", {})["level"] = value

    def set_execution_timeout(self, value: int) -> None:
        self._local_settings.setdefault("execution", {})["timeout"] = value

    def set_auto_rollback(self, value: bool) -> None:
        self._local_settings.setdefault("execution", {})["auto_rollback"] = value

    def set_max_concurrent_sessions(self, value: int) -> None:
        self._local_settings.setdefault("execution", {})["max_concurrent_sessions"] = value

    def set_alerts_enabled(self, value: bool) -> None:
        self._local_settings.setdefault("notifications", {})["alerts_enabled"] = value

    def set_webhook_url(self, value: str) -> None:
        self._local_settings.setdefault("notifications", {})["webhook_url"] = value

    def save_settings(self) -> bool:
        self._validation_errors = []
        errors = self._validate()
        if errors:
            self._validation_errors = errors
            return False

        try:
            config_path = Path("config/default.json")
            config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(self._local_settings, f, indent=2)
            self._save_original()
            self.append_output("Settings saved successfully")
            return True
        except Exception as exc:
            self._logger.warning("Could not save settings: %s", exc)
            self.append_output(f"Save failed: {exc}")
            return False

    def reset_settings(self) -> None:
        self._local_settings = json.loads(json.dumps(self._original_settings))
        self.append_output("Settings reset to last saved values")

    def _validate(self) -> list[str]:
        errors = []
        vm = self._local_settings.get("vm", {})
        if not vm.get("vm_name"):
            errors.append("VM name is required")
        if not vm.get("snapshot_name"):
            errors.append("Snapshot name is required")
        timeout = self._local_settings.get("execution", {}).get("timeout", 0)
        if not isinstance(timeout, int) or timeout <= 0:
            errors.append("Execution timeout must be a positive integer")
        if timeout > 300:
            errors.append("Execution timeout cannot exceed 300 seconds")
        return errors

    def append_output(self, text: str) -> None:
        self._output += f"[{datetime.now().strftime('%H:%M:%S')}] {text}\n"

    def clear_output(self) -> None:
        self._output = ""