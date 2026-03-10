import type {
  BackendAuthStrategy,
  BackendCapability,
  BackendHealthSnapshot,
  BackendProfile,
  BackendProfileKind,
  BackendTransport,
} from "../../domain/backendProfile";
import type {
  BackendCapabilitiesState,
  BackendEndpointState,
  RawBackendEndpointState,
} from "./types";
import type {
  FeatureBinding,
  FeatureDegradedBehavior,
  FeatureKey,
} from "../../domain/featureBinding";

export interface RawBackendCredentialRef {
  kind: "kubernetes_secret" | "server_env" | "operator_token";
  id: string;
  field?: string | null;
}

export interface RawBackendAuthStrategy {
  type: "none" | "bearer_secret_ref" | "oauth_broker" | "header_token" | "provider_native";
  credential_ref?: RawBackendCredentialRef | null;
}

export interface RawBackendHealthSnapshot {
  status: "unknown" | "healthy" | "degraded" | "unreachable" | "misconfigured";
  checked_at?: string | null;
  message?: string | null;
}

export interface RawBackendProfileRecord {
  id: string;
  label: string;
  kind: BackendProfileKind;
  base_url: string;
  transport: BackendTransport;
  auth_strategy: RawBackendAuthStrategy;
  capabilities: BackendCapability[];
  default_model?: string | null;
  enabled: boolean;
  metadata?: Record<string, string>;
  health: RawBackendHealthSnapshot;
}

export interface RawFeatureBindingRetryPolicy {
  max_attempts: number;
  backoff_ms: number;
}

export interface RawFeatureBindingRecord {
  feature_key: FeatureKey;
  primary_backend_profile_id: string;
  fallback_backend_profile_id?: string | null;
  enabled: boolean;
  model_override?: string | null;
  timeout_ms?: number | null;
  retry_policy?: RawFeatureBindingRetryPolicy | null;
  degraded_behavior?: FeatureDegradedBehavior | null;
}

export interface RawBackendBindingCompatibilityState {
  legacy_source: "default" | "override";
  endpoint_state?: RawBackendEndpointState | null;
  legacy_profiles?: RawBackendProfileRecord[];
  legacy_bindings?: RawFeatureBindingRecord[];
}

export interface RawBackendCapabilitiesState {
  capabilities?: BackendCapability[];
  capability_keys?: BackendCapability[];
  feature_keys?: FeatureKey[];
  compatibility?: RawBackendBindingCompatibilityState | null;
}

export interface RawBindingCompatibilityResolution {
  feature_key: FeatureKey;
  source: "legacy_bridge" | "binding_store";
  backend_profile_id?: string | null;
  status: "ready" | "unavailable" | "misconfigured";
}

export interface RawBackendCapabilitiesCatalog {
  backend_capabilities: BackendCapability[];
  feature_keys: FeatureKey[];
  compatibility: {
    legacy_backend_source: "default" | "override";
    legacy_backend_state: RawBackendEndpointState;
    capture_resolutions: RawBindingCompatibilityResolution[];
  };
}

export interface BindingCompatibilityResolution {
  featureKey: FeatureKey;
  source: "legacy_bridge" | "binding_store";
  backendProfileId?: string | null;
  status: "ready" | "unavailable" | "misconfigured";
}

export interface BackendCapabilitiesCatalog {
  backendCapabilities: BackendCapability[];
  featureKeys: FeatureKey[];
  compatibility: {
    legacyBackendSource: "default" | "override";
    legacyBackendState: BackendEndpointState;
    captureResolutions: BindingCompatibilityResolution[];
  };
}

export function normalizeBackendAuthStrategy(
  raw: RawBackendAuthStrategy
): BackendAuthStrategy {
  return {
    type: raw.type,
    credentialRef: raw.credential_ref
      ? {
          kind: raw.credential_ref.kind,
          id: raw.credential_ref.id,
          field: raw.credential_ref.field ?? undefined,
        }
      : null,
  };
}

export function normalizeBackendHealthSnapshot(
  raw: RawBackendHealthSnapshot
): BackendHealthSnapshot {
  return {
    status: raw.status,
    checkedAt: raw.checked_at ?? undefined,
    message: raw.message ?? undefined,
  };
}

export function normalizeBackendProfileRecord(
  raw: RawBackendProfileRecord
): BackendProfile {
  return {
    id: raw.id,
    label: raw.label,
    kind: raw.kind,
    baseUrl: raw.base_url,
    transport: raw.transport,
    authStrategy: normalizeBackendAuthStrategy(raw.auth_strategy),
    capabilities: raw.capabilities,
    defaultModel: raw.default_model ?? null,
    enabled: raw.enabled,
    metadata: raw.metadata ?? {},
    health: normalizeBackendHealthSnapshot(raw.health),
  };
}

export function normalizeFeatureBindingRecord(
  raw: RawFeatureBindingRecord
): FeatureBinding {
  return {
    featureKey: raw.feature_key,
    primaryBackendProfileId: raw.primary_backend_profile_id,
    fallbackBackendProfileId: raw.fallback_backend_profile_id ?? null,
    enabled: raw.enabled,
    modelOverride: raw.model_override ?? null,
    timeoutMs: raw.timeout_ms ?? undefined,
    retryPolicy: raw.retry_policy
      ? {
          maxAttempts: raw.retry_policy.max_attempts,
          backoffMs: raw.retry_policy.backoff_ms,
        }
      : undefined,
    degradedBehavior: raw.degraded_behavior ?? undefined,
  };
}

export function denormalizeBackendHealthSnapshot(
  health: BackendProfile["health"]
): RawBackendHealthSnapshot {
  return {
    status: health.status,
    checked_at: health.checkedAt ?? null,
    message: health.message ?? null,
  };
}

export function denormalizeBackendAuthStrategy(
  strategy: BackendProfile["authStrategy"]
): RawBackendAuthStrategy {
  return {
    type: strategy.type,
    credential_ref: strategy.credentialRef
      ? {
          kind: strategy.credentialRef.kind,
          id: strategy.credentialRef.id,
          field: strategy.credentialRef.field ?? null,
        }
      : null,
  };
}

export function denormalizeBackendProfileRecord(
  profile: BackendProfile
): RawBackendProfileRecord {
  return {
    id: profile.id,
    label: profile.label,
    kind: profile.kind,
    base_url: profile.baseUrl,
    transport: profile.transport,
    auth_strategy: denormalizeBackendAuthStrategy(profile.authStrategy),
    capabilities: profile.capabilities,
    default_model: profile.defaultModel ?? null,
    enabled: profile.enabled,
    metadata: profile.metadata,
    health: denormalizeBackendHealthSnapshot(profile.health),
  };
}

export function denormalizeFeatureBindingRecord(
  binding: FeatureBinding
): RawFeatureBindingRecord {
  return {
    feature_key: binding.featureKey,
    primary_backend_profile_id: binding.primaryBackendProfileId,
    fallback_backend_profile_id: binding.fallbackBackendProfileId ?? null,
    enabled: binding.enabled,
    model_override: binding.modelOverride ?? null,
    timeout_ms: binding.timeoutMs ?? null,
    retry_policy: binding.retryPolicy
      ? {
          max_attempts: binding.retryPolicy.maxAttempts,
          backoff_ms: binding.retryPolicy.backoffMs,
        }
      : null,
    degraded_behavior: binding.degradedBehavior ?? null,
  };
}

function normalizeBackendEndpointState(raw: RawBackendEndpointState): BackendEndpointState {
  return {
    deployment: raw.deployment,
    apiBaseUrl: raw.api_base_url,
    transcribePath: raw.transcribe_path,
    streamingPath: raw.streaming_path,
    authEnabled: raw.auth_enabled,
    hasClientId: raw.has_client_id,
    hasClientSecret: raw.has_client_secret,
    verifySsl: raw.verify_ssl,
    source: raw.source,
  };
}

export function normalizeBackendCapabilitiesState(
  raw: RawBackendCapabilitiesState
): BackendCapabilitiesState {
  const compatibility = raw.compatibility;
  return {
    capabilityKeys: raw.capability_keys ?? raw.capabilities ?? [],
    featureKeys: raw.feature_keys ?? [],
    compatibility: {
      legacySource: compatibility?.legacy_source ?? "default",
      endpointState: compatibility?.endpoint_state
        ? normalizeBackendEndpointState(compatibility.endpoint_state)
        : null,
      legacyProfiles: (compatibility?.legacy_profiles ?? []).map((entry) =>
        normalizeBackendProfileRecord(entry)
      ),
      legacyBindings: (compatibility?.legacy_bindings ?? []).map((entry) =>
        normalizeFeatureBindingRecord(entry)
      ),
    },
  };
}

function normalizeBindingCompatibilityResolution(
  raw: RawBindingCompatibilityResolution
): BindingCompatibilityResolution {
  return {
    featureKey: raw.feature_key,
    source: raw.source,
    backendProfileId: raw.backend_profile_id ?? null,
    status: raw.status,
  };
}

export function normalizeBackendCapabilitiesCatalog(
  raw: RawBackendCapabilitiesCatalog,
  legacyBackendState: BackendEndpointState
): BackendCapabilitiesCatalog {
  return {
    backendCapabilities: raw.backend_capabilities,
    featureKeys: raw.feature_keys,
    compatibility: {
      legacyBackendSource: raw.compatibility.legacy_backend_source,
      legacyBackendState,
      captureResolutions: raw.compatibility.capture_resolutions.map(
        normalizeBindingCompatibilityResolution
      ),
    },
  };
}
