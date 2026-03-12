import { normalizeBackendApiBaseUrl } from "../utils/backendEndpointUrl";

export type BackendProfileKind = "stt" | "llm" | "translate" | "tts" | "multimodal";

export type BackendTransport = "http" | "websocket" | "grpc";

export type BackendCapability =
  | "stt.realtime"
  | "stt.file"
  | "artifact.summary"
  | "artifact.qa"
  | "translate.turn_final"
  | "translate.turn_partial"
  | "tts.speak"
  | "tts.stream";

export type BackendAuthStrategyType =
  | "none"
  | "bearer_secret_ref"
  | "oauth_broker"
  | "header_token"
  | "provider_native";

export interface BackendCredentialRef {
  kind: "kubernetes_secret" | "server_env" | "operator_token";
  id: string;
  field?: string;
}

export interface BackendAuthStrategy {
  type: BackendAuthStrategyType;
  credentialRef?: BackendCredentialRef | null;
}

export type BackendHealthStatus =
  | "unknown"
  | "healthy"
  | "degraded"
  | "unreachable"
  | "misconfigured";

export interface BackendHealthSnapshot {
  status: BackendHealthStatus;
  checkedAt?: string | null;
  message?: string | null;
}

export interface BackendProfile {
  id: string;
  label: string;
  kind: BackendProfileKind;
  baseUrl: string;
  transport: BackendTransport;
  authStrategy: BackendAuthStrategy;
  capabilities: BackendCapability[];
  defaultModel?: string | null;
  enabled: boolean;
  metadata: Record<string, string>;
  health: BackendHealthSnapshot;
}

export interface BackendProfileInput {
  id: string;
  label: string;
  kind: BackendProfileKind;
  baseUrl: string;
  transport?: BackendTransport;
  authStrategy?: BackendAuthStrategy;
  capabilities?: BackendCapability[];
  defaultModel?: string | null;
  enabled?: boolean;
  metadata?: Record<string, string>;
  health?: BackendHealthSnapshot;
}

const USABLE_BACKEND_HEALTH_STATUSES = new Set<BackendHealthStatus>([
  "unknown",
  "healthy",
]);

const AUTH_STRATEGIES_REQUIRING_REF = new Set<BackendAuthStrategyType>([
  "bearer_secret_ref",
  "header_token",
]);

function normalizeAuthStrategy(authStrategy?: BackendAuthStrategy): BackendAuthStrategy {
  const normalized: BackendAuthStrategy = authStrategy ?? { type: "none" };
  if (
    AUTH_STRATEGIES_REQUIRING_REF.has(normalized.type) &&
    (!normalized.credentialRef?.id || !normalized.credentialRef.kind)
  ) {
    throw new Error("BACKEND_PROFILE_CREDENTIAL_REF_REQUIRED");
  }
  if (normalized.credentialRef) {
    return {
      ...normalized,
      credentialRef: {
        ...normalized.credentialRef,
        id: normalized.credentialRef.id.trim(),
        field: normalized.credentialRef.field?.trim() || undefined,
      },
    };
  }
  return normalized;
}

function normalizeCapabilities(
  capabilities: BackendCapability[] | undefined
): BackendCapability[] {
  return Array.from(new Set(capabilities ?? [])).sort();
}

function normalizeMetadata(
  metadata: Record<string, string> | undefined
): Record<string, string> {
  if (!metadata) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(metadata)
      .map(([key, value]) => [key.trim(), value.trim()] as const)
      .filter(([key, value]) => key.length > 0 && value.length > 0)
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

export function createBackendProfile(input: BackendProfileInput): BackendProfile {
  return {
    id: input.id.trim(),
    label: input.label.trim(),
    kind: input.kind,
    baseUrl: normalizeBackendApiBaseUrl(input.baseUrl),
    transport: input.transport ?? "http",
    authStrategy: normalizeAuthStrategy(input.authStrategy),
    capabilities: normalizeCapabilities(input.capabilities),
    defaultModel: input.defaultModel?.trim() || null,
    enabled: input.enabled ?? true,
    metadata: normalizeMetadata(input.metadata),
    health: input.health ?? { status: "unknown" },
  };
}

export function backendProfileSupportsCapability(
  profile: Pick<BackendProfile, "capabilities">,
  capability: BackendCapability
): boolean {
  return profile.capabilities.includes(capability);
}

export function isBackendHealthStatusUsable(status: BackendHealthStatus): boolean {
  return USABLE_BACKEND_HEALTH_STATUSES.has(status);
}

export function isBackendProfileOperational(
  profile: Pick<BackendProfile, "enabled" | "health">
): boolean {
  return profile.enabled && isBackendHealthStatusUsable(profile.health.status);
}
