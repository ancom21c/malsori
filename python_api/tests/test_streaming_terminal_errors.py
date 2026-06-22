from __future__ import annotations

import grpc

from api_server import main


class FakeGrpcError(grpc.RpcError):
    def __init__(self, code: grpc.StatusCode, details: str):
        super().__init__()
        self._code = code
        self._details = details

    def code(self) -> grpc.StatusCode:
        return self._code

    def details(self) -> str:
        return self._details


def test_grpc_terminal_error_payload_marks_request_errors_non_retryable() -> None:
    payload = main._grpc_terminal_error_payload(
        FakeGrpcError(grpc.StatusCode.NOT_FOUND, "pipeline preset not found")
    )

    assert payload["type"] == "error"
    assert payload["code"] == "UPSTREAM_GRPC_NOT_FOUND"
    assert payload["message"] == (
        "Upstream gRPC streaming failed: pipeline preset not found"
    )
    assert payload["retryable"] is False
    assert payload["terminal"] is True
    assert payload["upstream_status"] == "NOT_FOUND"
