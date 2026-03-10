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


BackendProfileKind = Literal["stt", "llm", "translate", "tts", "multimodal"]
BackendTransport = Literal["http", "websocket", "grpc"]
BackendCapability = Literal[
    "stt.realtime",
    "stt.file",
    "artifact.summary",
    "artifact.qa",
    "translate.turn_final",
    "translate.turn_partial",
    "tts.speak",
    "tts.stream",
]
BackendAuthStrategyType = Literal[
    "none",
    "bearer_secret_ref",
    "oauth_broker",
    "header_token",
    "provider_native",
]
BackendHealthStatus = Literal["unknown", "healthy", "degraded", "unreachable", "misconfigured"]
FeatureKey = Literal[
    "capture.realtime",
    "capture.file",
    "artifact.summary",
    "artifact.qa",
    "translate.turn_final",
    "translate.turn_partial",
    "tts.speak",
    "tts.stream",
]
FeatureDegradedBehavior = Literal["hide", "disable", "source_only", "transcript_only", "retry"]


class BackendCredentialRef(BaseModel):
    """Reference to a server-side credential source."""

    kind: Literal["kubernetes_secret", "server_env", "operator_token"]
    id: str
    field: Optional[str] = None


class BackendAuthStrategyModel(BaseModel):
    """Auth strategy contract for an internal backend profile."""

    type: BackendAuthStrategyType
    credential_ref: Optional[BackendCredentialRef] = None


class BackendHealthSnapshotModel(BaseModel):
    """Health snapshot for a backend profile."""

    status: BackendHealthStatus
    checked_at: Optional[str] = None
    message: Optional[str] = None


class BackendProfileRecord(BaseModel):
    """Internal admin API contract for a backend profile."""

    id: str
    label: str
    kind: BackendProfileKind
    base_url: str
    transport: BackendTransport
    auth_strategy: BackendAuthStrategyModel
    capabilities: list[BackendCapability]
    default_model: Optional[str] = None
    enabled: bool = True
    metadata: dict[str, str] = Field(default_factory=dict)
    health: BackendHealthSnapshotModel


class FeatureBindingRetryPolicyModel(BaseModel):
    """Retry policy contract for a feature binding."""

    max_attempts: int = Field(..., ge=0)
    backoff_ms: int = Field(..., ge=0)


class FeatureBindingRecord(BaseModel):
    """Internal admin API contract for feature-to-backend binding."""

    feature_key: FeatureKey
    primary_backend_profile_id: str
    fallback_backend_profile_id: Optional[str] = None
    enabled: bool = True
    model_override: Optional[str] = None
    timeout_ms: Optional[int] = Field(default=None, ge=0)
    retry_policy: Optional[FeatureBindingRetryPolicyModel] = None
    degraded_behavior: Optional[FeatureDegradedBehavior] = None


class HealthStatusResponse(BaseModel):
    """Operational health status for deployment smoke checks."""

    status: Literal["ok"]
    service: str
    version: str
    deployment: Literal["cloud", "onprem"]
    auth_enabled: bool
    source: Literal["default", "override"]
    backend_admin_enabled: bool


class FrontendRuntimeErrorReport(BaseModel):
    """Client-side runtime error payload forwarded by the webapp."""

    kind: Literal["error", "unhandledrejection"]
    message: str = Field(..., min_length=1, max_length=2000)
    stack: Optional[str] = Field(default=None, max_length=8000)
    page_url: Optional[str] = Field(default=None, max_length=1024)
    route: Optional[str] = Field(default=None, max_length=512)
    user_agent: Optional[str] = Field(default=None, max_length=1024)
    locale: Optional[str] = Field(default=None, max_length=64)
    app_version: Optional[str] = Field(default=None, max_length=128)


class FrontendRuntimeErrorAck(BaseModel):
    """Ack response for runtime error ingestion."""

    accepted: Literal[True] = True
    event_id: str
