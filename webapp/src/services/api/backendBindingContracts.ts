import type {
  BackendAuthStrategy,
  BackendCapability,
  BackendHealthSnapshot,
  BackendProfile,
  BackendProfileKind,
  BackendTransport,
} from "../../domain/backendProfile";
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
