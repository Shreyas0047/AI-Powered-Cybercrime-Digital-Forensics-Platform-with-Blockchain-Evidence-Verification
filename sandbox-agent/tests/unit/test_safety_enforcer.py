"""Tests for safety enforcer module."""

import pytest
from forensics_sandbox_agent.infrastructure.execution.safety_enforcer import (
    SafetyEnforcer,
    SafetyConfig,
    ExecutionState,
)


class TestSafetyEnforcer:
    """Test cases for SafetyEnforcer."""

    def test_default_config(self):
        """Test safety enforcer initializes with default config."""
        enforcer = SafetyEnforcer()
        assert enforcer._config.vm_marker_path == "C:/sandbox/guest.marker"
        assert enforcer._config.enforce_runtime_limit is True
        assert enforcer._config.max_runtime_seconds == 300

    def test_custom_config(self):
        """Test safety enforcer accepts custom config."""
        config = SafetyConfig(
            vm_marker_path="C:/test/marker",
            max_runtime_seconds=600,
        )
        enforcer = SafetyEnforcer(config=config)
        assert enforcer._config.vm_marker_path == "C:/test/marker"
        assert enforcer._config.max_runtime_seconds == 600

    def test_validate_environment_no_marker(self):
        """Test environment validation when marker is missing."""
        enforcer = SafetyEnforcer()
        result = enforcer.validate_execution_environment()

        # Should fail because marker doesn't exist
        assert result.is_safe is False
        assert result.state == ExecutionState.UNSAFE
        assert len(result.errors) > 0

    def test_validation_history(self):
        """Test validation history is tracked."""
        enforcer = SafetyEnforcer()
        enforcer.validate_execution_environment()
        enforcer.validate_execution_environment()

        summary = enforcer.get_validation_summary()
        assert summary["total_validations"] == 2

    def test_simulator_execution_validation(self):
        """Test simulator execution validation."""
        enforcer = SafetyEnforcer()
        result = enforcer.validate_simulator_execution(
            simulator_id="test-sim",
            simulator_path="nonexistent.exe",
        )

        # Should fail due to environment and missing file
        assert result.state in (ExecutionState.UNSAFE, ExecutionState.BLOCKED)

    def test_network_target_validation(self):
        """Test network target validation."""
        enforcer = SafetyEnforcer()

        # localhost should be allowed
        result = enforcer.validate_network_target("127.0.0.1", 8080)
        assert result.is_safe is True
        assert result.state == ExecutionState.SAFE

        # external IP should be blocked
        result = enforcer.validate_network_target("192.168.1.100", 8080)
        assert result.is_safe is False
        assert result.state == ExecutionState.BLOCKED

    def test_file_operation_validation(self):
        """Test file operation validation."""
        enforcer = SafetyEnforcer()

        # Safe directory should be allowed
        result = enforcer.validate_file_operation("C:/temp/test.txt", "write")
        assert result.is_safe is True
        assert result.state == ExecutionState.SAFE

        # Unsafe directory should be blocked
        result = enforcer.validate_file_operation("C:/Windows/System32/test.dll", "write")
        assert result.is_safe is False
        assert result.state == ExecutionState.BLOCKED


class TestRuntimeEnforcer:
    """Test cases for RuntimeEnforcer."""

    def test_execution_tracking(self):
        """Test execution start and end tracking."""
        from forensics_sandbox_agent.infrastructure.execution.safety_enforcer import RuntimeEnforcer

        config = SafetyConfig(enforce_runtime_limit=True, max_runtime_seconds=300)
        enforcer = RuntimeEnforcer(config=config, logger=None)

        result = enforcer.start_execution("test-session-1")
        assert result is True
        assert enforcer.is_execution_active() is True

        enforcer.end_execution()
        assert enforcer.is_execution_active() is False

    def test_runtime_limit_check(self):
        """Test runtime limit enforcement."""
        from forensics_sandbox_agent.infrastructure.execution.safety_enforcer import RuntimeEnforcer
        import time

        config = SafetyConfig(enforce_runtime_limit=True, max_runtime_seconds=0)
        enforcer = RuntimeEnforcer(config=config, logger=None)

        enforcer.start_execution("test-session")
        time.sleep(0.1)
        result = enforcer.check_runtime_limit()
        assert result is False  # Should exceed the 0 second limit
        enforcer.end_execution()

    def test_duplicate_execution_prevention(self):
        """Test that duplicate executions are prevented."""
        from forensics_sandbox_agent.infrastructure.execution.safety_enforcer import RuntimeEnforcer

        config = SafetyConfig()
        enforcer = RuntimeEnforcer(config=config, logger=None)

        enforcer.start_execution("session-1")
        result = enforcer.start_execution("session-2")

        assert result is False  # Should not allow second execution
        enforcer.end_execution()