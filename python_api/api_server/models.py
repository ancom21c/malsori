"""Pydantic models for the STT delegation API."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class STTArgument(BaseModel):
    """Request payload for the upstream STT API."""

    language_code: str = Field(
        ..., description="Target language code, expected to be 'korean'."
    )
    audio: str = Field(..., description="Base64 encoded audio payload.")


class STTRequest(BaseModel):
    """Top-level request schema for /stt_api."""

    argument: STTArgument


class STTReturnObject(BaseModel):
    """Response payload returned to the caller."""

    recognized: str = Field("", description="Recognized transcription text.")


class STTResponse(BaseModel):
    """Standardized response envelope."""

    result: int = Field(..., description="0 on success, -1 on failure.")
    return_type: str = Field(
        "com.google.gson.internal.LinkedTreeMap",
        description="Fixed return type required by the upstream consumer.",
    )
    return_object: STTReturnObject


class BackendEndpointState(BaseModel):
    """Current upstream endpoint configuration summary."""

    deployment: Literal["cloud", "onprem"]
    api_base_url: str
    transcribe_path: str
    streaming_path: str
    auth_enabled: bool
    has_client_id: bool
    has_client_secret: bool
    verify_ssl: bool
    source: Literal["default", "override"]


class BackendEndpointUpdateRequest(BaseModel):
    """Payload for updating the upstream endpoint configuration."""

    deployment: Literal["cloud", "onprem"]
    api_base_url: str = Field(..., description="Base URL of the upstream RTZR/On-prem API.")
    client_id: Optional[str] = Field(
        default=None, description="Optional client ID for RTZR cloud deployments."
    )
    client_secret: Optional[str] = Field(
        default=None, description="Optional client secret for RTZR cloud deployments."
    )
    verify_ssl: bool = Field(
        default=True, description="Whether SSL certificates should be verified."
    )
