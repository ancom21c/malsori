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
SummaryMode = Literal["realtime", "full"]
SummaryRunScope = Literal["partition", "session"]
SummaryRunTrigger = Literal[
    "realtime_batch",
    "session_ready",
    "manual_regenerate",
    "manual_retry",
    "preset_apply_from_now",
    "preset_rerun_all",
]
SummaryRegenerationScope = Literal["partition", "mode", "session"]
SummaryPresetSelectionSource = Literal["default", "auto", "manual"]
SummaryPresetSectionKind = Literal["narrative", "bullet_list", "quote_list"]
TranslationScope = Literal["turn"]


class BackendCredentialRef(BaseModel):
    """Reference to a server-side credential source."""

    kind: Literal["kubernetes_secret", "server_env", "operator_token"]
    id: str = Field(..., min_length=1)
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

    id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    kind: BackendProfileKind
    base_url: str = Field(..., min_length=1)
    transport: BackendTransport = "http"
    auth_strategy: BackendAuthStrategyModel = Field(
        default_factory=lambda: BackendAuthStrategyModel(type="none")
    )
    capabilities: list[BackendCapability] = Field(default_factory=list)
    default_model: Optional[str] = None
    enabled: bool = True
    metadata: dict[str, str] = Field(default_factory=dict)
    health: BackendHealthSnapshotModel = Field(
        default_factory=lambda: BackendHealthSnapshotModel(status="unknown")
    )


class FeatureBindingRetryPolicyModel(BaseModel):
    """Retry policy contract for a feature binding."""

    max_attempts: int = Field(..., ge=0)
    backoff_ms: int = Field(..., ge=0)


class FeatureBindingRecord(BaseModel):
    """Internal admin API contract for feature-to-backend binding."""

    feature_key: FeatureKey
    primary_backend_profile_id: str = Field(..., min_length=1)
    fallback_backend_profile_id: Optional[str] = None
    enabled: bool = True
    model_override: Optional[str] = None
    timeout_ms: Optional[int] = Field(default=None, ge=0)
    retry_policy: Optional[FeatureBindingRetryPolicyModel] = None
    degraded_behavior: Optional[FeatureDegradedBehavior] = None


class BackendProfilesResponse(BaseModel):
    """List response for operator-managed backend profiles."""

    profiles: list[BackendProfileRecord] = Field(default_factory=list)


class BackendProfileHealthResponse(BaseModel):
    """Health snapshot response for an operator-managed backend profile."""

    profile_id: str = Field(..., min_length=1)
    refreshed: bool = False
    health: BackendHealthSnapshotModel


class SummaryPresetSectionSchemaModel(BaseModel):
    """Structured output section requested from the summary provider."""

    id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    kind: SummaryPresetSectionKind
    required: bool = True


class SummaryExecutionPresetModel(BaseModel):
    """Preset metadata supplied by the client for summary execution."""

    id: str = Field(..., min_length=1)
    version: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    description: Optional[str] = None
    language: Optional[str] = None
    output_schema: list[SummaryPresetSectionSchemaModel] = Field(default_factory=list)


class SummaryExecutionTurnModel(BaseModel):
    """Transcript turn snapshot supplied for provider-backed summary generation."""

    id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    speaker_label: Optional[str] = None
    language: Optional[str] = None
    start_ms: Optional[int] = Field(default=None, ge=0)
    end_ms: Optional[int] = Field(default=None, ge=0)


class FullSummaryRequest(BaseModel):
    """Public API request payload for a full-session summary run."""

    session_id: str = Field(..., min_length=1)
    title: Optional[str] = None
    source_revision: str = Field(..., min_length=1)
    source_language: Optional[str] = None
    output_language: Optional[str] = None
    selection_source: SummaryPresetSelectionSource = "default"
    trigger: SummaryRunTrigger = "session_ready"
    regeneration_scope: Optional[SummaryRegenerationScope] = None
    preset: SummaryExecutionPresetModel
    turns: list[SummaryExecutionTurnModel] = Field(default_factory=list, min_length=1)


class SummarySupportingSnippetModel(BaseModel):
    """Source-linked supporting snippet returned by the summary provider adapter."""

    id: str = Field(..., min_length=1)
    turn_id: Optional[str] = None
    speaker_label: Optional[str] = None
    start_ms: Optional[int] = Field(default=None, ge=0)
    end_ms: Optional[int] = Field(default=None, ge=0)
    text: str = Field(..., min_length=1)


class SummaryBlockResultModel(BaseModel):
    """Structured summary block returned to the webapp."""

    id: str = Field(..., min_length=1)
    kind: str = Field(..., min_length=1)
    title: Optional[str] = None
    content: str = Field(..., min_length=1)
    supporting_snippets: list[SummarySupportingSnippetModel] = Field(default_factory=list)


class SummaryExecutionBindingAuditModel(BaseModel):
    """Resolved binding/profile metadata persisted alongside a summary run."""

    feature_key: Literal["artifact.summary"] = "artifact.summary"
    resolved_backend_profile_id: str = Field(..., min_length=1)
    fallback_backend_profile_id: Optional[str] = None
    used_fallback: bool = False
    provider_label: str = Field(..., min_length=1)
    model: Optional[str] = None
    timeout_ms: Optional[int] = Field(default=None, ge=0)
    retry_policy: Optional[FeatureBindingRetryPolicyModel] = None


class FullSummaryResponse(BaseModel):
    """Public API response payload for a full-session summary run."""

    run_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    mode: Literal["full"] = "full"
    scope: SummaryRunScope = "session"
    trigger: SummaryRunTrigger
    regeneration_scope: Optional[SummaryRegenerationScope] = None
    preset_id: str = Field(..., min_length=1)
    preset_version: str = Field(..., min_length=1)
    selection_source: SummaryPresetSelectionSource
    source_revision: str = Field(..., min_length=1)
    source_language: Optional[str] = None
    output_language: Optional[str] = None
    requested_at: str = Field(..., min_length=1)
    completed_at: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    partition_ids: list[str] = Field(default_factory=list)
    supporting_snippets: list[SummarySupportingSnippetModel] = Field(default_factory=list)
    blocks: list[SummaryBlockResultModel] = Field(default_factory=list)
    binding: SummaryExecutionBindingAuditModel


class FinalTurnTranslationRequest(BaseModel):
    """Public API request payload for a final-turn translation run."""

    session_id: str = Field(..., min_length=1)
    turn_id: str = Field(..., min_length=1)
    source_revision: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    speaker_label: Optional[str] = None
    source_language: Optional[str] = None
    target_language: str = Field(..., min_length=1)
    start_ms: Optional[int] = Field(default=None, ge=0)
    end_ms: Optional[int] = Field(default=None, ge=0)


class TranslationExecutionBindingAuditModel(BaseModel):
    """Resolved binding/profile metadata persisted alongside a translation run."""

    feature_key: Literal["translate.turn_final"] = "translate.turn_final"
    resolved_backend_profile_id: str = Field(..., min_length=1)
    fallback_backend_profile_id: Optional[str] = None
    used_fallback: bool = False
    provider_label: str = Field(..., min_length=1)
    model: Optional[str] = None
    timeout_ms: Optional[int] = Field(default=None, ge=0)
    retry_policy: Optional[FeatureBindingRetryPolicyModel] = None


class FinalTurnTranslationResponse(BaseModel):
    """Public API response payload for a translated final turn."""

    translation_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    turn_id: str = Field(..., min_length=1)
    scope: TranslationScope = "turn"
    source_revision: str = Field(..., min_length=1)
    source_language: Optional[str] = None
    target_language: str = Field(..., min_length=1)
    requested_at: str = Field(..., min_length=1)
    completed_at: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    binding: TranslationExecutionBindingAuditModel


class FeatureBindingsResponse(BaseModel):
    """List response for operator-managed feature bindings."""

    bindings: list[FeatureBindingRecord] = Field(default_factory=list)


class BackendBindingCompatibilityState(BaseModel):
    """Compatibility view bridging the legacy STT override to the new binding system."""

    legacy_source: Literal["default", "override"]
    endpoint_state: Optional[BackendEndpointState] = None
    legacy_profiles: list[BackendProfileRecord] = Field(default_factory=list)
    legacy_bindings: list[FeatureBindingRecord] = Field(default_factory=list)


class BackendCapabilitiesResponse(BaseModel):
    """Operator-facing catalog of supported capabilities and compatibility state."""

    capability_keys: list[BackendCapability] = Field(default_factory=list)
    feature_keys: list[FeatureKey] = Field(default_factory=list)
    compatibility: BackendBindingCompatibilityState


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
