from forensics_sandbox_agent.app.config.loader import load_settings


def test_default_settings_load() -> None:
    settings = load_settings()
    assert settings.application.name == "Forensics Sandbox Agent"
