"""Tests for configuration loader."""

import pytest
import tempfile
import json
from pathlib import Path
from forensics_sandbox_agent.app.config.loader import load_settings, _read_config


class TestConfigLoader:
    """Test cases for configuration loader."""

    def test_load_default_settings(self):
        """Test loading default settings."""
        settings = load_settings()
        assert settings.application.name == "Forensics Sandbox Agent"
        assert settings.application.version == "0.1.0"

    def test_settings_have_required_sections(self):
        """Test all required configuration sections exist."""
        settings = load_settings()

        assert hasattr(settings, 'application')
        assert hasattr(settings, 'paths')
        assert hasattr(settings, 'logging')
        assert hasattr(settings, 'vm')
        assert hasattr(settings, 'reporting')
        assert hasattr(settings, 'execution_policy')
        assert hasattr(settings, 'monitoring')

    def test_paths_are_resolved(self):
        """Test that paths are properly resolved."""
        settings = load_settings()

        assert settings.paths.logs_dir is not None
        assert settings.paths.logs_dir.is_absolute()

    def test_execution_policy_config(self):
        """Test execution policy configuration."""
        settings = load_settings()

        assert settings.execution_policy.sandbox_execution.vm_name == "ForensicsSandbox"
        assert settings.execution_policy.sandbox_execution.execution_timeout_seconds == 300
        assert settings.execution_policy.rollback_policy.enabled is True

    def test_monitoring_config(self):
        """Test monitoring configuration."""
        settings = load_settings()

        assert settings.monitoring.process.enabled is True
        assert settings.monitoring.file_system.enabled is True
        assert settings.monitoring.registry.enabled is True
        assert settings.monitoring.network.enabled is True


class TestConfigReader:
    """Test cases for configuration file reading."""

    def test_read_json_config(self):
        """Test reading JSON configuration."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({"application": {"name": "Test", "version": "1.0", "environment": "test", "theme": "light"}}, f)
            temp_path = Path(f.name)

        try:
            data = _read_config(temp_path)
            assert data["application"]["name"] == "Test"
        finally:
            temp_path.unlink()

    def test_read_yaml_config(self):
        """Test reading YAML configuration."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("application:\n  name: Test\n  version: '1.0'\n  environment: test\n  theme: light\n")
            temp_path = Path(f.name)

        try:
            data = _read_config(temp_path)
            assert data["application"]["name"] == "Test"
        finally:
            temp_path.unlink()

    def test_missing_config_raises_error(self):
        """Test that missing config file raises error."""
        with pytest.raises(FileNotFoundError):
            load_settings(Path("nonexistent.yaml"))

    def test_unsupported_format_raises_error(self):
        """Test that unsupported format raises error."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("test content")
            temp_path = Path(f.name)

        try:
            with pytest.raises(ValueError):
                _read_config(temp_path)
        finally:
            temp_path.unlink()