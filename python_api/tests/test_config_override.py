import json
from pathlib import Path

import pytest

from api_server import config


@pytest.fixture(autouse=True)
def clear_settings_cache() -> None:
    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()


def test_apply_backend_override_preserves_existing_payload_on_replace_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("STT_STORAGE_BASE_DIR", str(tmp_path))

    override_path = tmp_path / "backend_endpoint.override.json"
    original_payload = {
        "deployment": "cloud",
        "pronaia_api_base": "https://old.example.com",
        "verify_ssl": True,
    }
    override_path.write_text(
        json.dumps(original_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    original_content = override_path.read_text(encoding="utf-8")

    real_replace = Path.replace

    def fail_replace(self: Path, target: Path | str) -> Path:
        if Path(target) == override_path:
            raise OSError("simulated atomic replace failure")
        return real_replace(self, target)

    monkeypatch.setattr(Path, "replace", fail_replace)

    with pytest.raises(OSError, match="simulated atomic replace failure"):
        config.apply_backend_override(
            {
                "deployment": "onprem",
                "pronaia_api_base": "https://new.example.com",
                "verify_ssl": False,
            }
        )

    assert override_path.read_text(encoding="utf-8") == original_content
    assert config.get_backend_override() == original_payload


def test_apply_backend_override_clears_env_credentials_when_payload_omits_them(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("STT_STORAGE_BASE_DIR", str(tmp_path))
    monkeypatch.setenv("PRONAIA_CLIENT_ID", "env-client-id")
    monkeypatch.setenv("PRONAIA_CLIENT_SECRET", "env-client-secret")

    settings = config.apply_backend_override(
        {
            "deployment": "onprem",
            "pronaia_api_base": "https://onprem.example.com",
            "verify_ssl": False,
            "pronaia_client_id": None,
            "pronaia_client_secret": None,
        }
    )

    assert settings.pronaia_client_id is None
    assert settings.pronaia_client_secret is None
    assert settings.auth_enabled is False
    assert config.get_backend_override() == {
        "deployment": "onprem",
        "pronaia_api_base": "https://onprem.example.com",
        "verify_ssl": False,
        "pronaia_client_id": None,
        "pronaia_client_secret": None,
    }
