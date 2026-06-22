from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api_server import main


def _build_app(*, origins: tuple[str, ...]) -> FastAPI:
    app = FastAPI()

    @app.get("/v1/health")
    async def health() -> dict[str, bool]:
        return {"ok": True}

    main._configure_public_cors(
        app,
        SimpleNamespace(cors_allowed_origins=origins),
    )
    return app


def test_public_cors_allows_configured_origin() -> None:
    client = TestClient(_build_app(origins=("https://pages.example.dev",)))

    preflight = client.options(
        "/v1/health",
        headers={
            "Origin": "https://pages.example.dev",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert preflight.status_code == 200
    assert (
        preflight.headers["access-control-allow-origin"]
        == "https://pages.example.dev"
    )

    response = client.get(
        "/v1/health",
        headers={"Origin": "https://pages.example.dev"},
    )
    assert response.status_code == 200
    assert (
        response.headers["access-control-allow-origin"]
        == "https://pages.example.dev"
    )


def test_public_cors_rejects_disallowed_origin() -> None:
    client = TestClient(_build_app(origins=("https://pages.example.dev",)))

    preflight = client.options(
        "/v1/health",
        headers={
            "Origin": "https://other.example.dev",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert preflight.status_code == 400
    assert "access-control-allow-origin" not in preflight.headers

    response = client.get(
        "/v1/health",
        headers={"Origin": "https://other.example.dev"},
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
