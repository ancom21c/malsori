import type { BackendProfile } from "../domain/backendProfile";
import type { FeatureBinding, FeatureKey } from "../domain/featureBinding";
import {
  denormalizeBackendProfileRecord,
  denormalizeFeatureBindingRecord,
  normalizeBackendProfileRecord,
  normalizeFeatureBindingRecord,
  type RawBackendProfileRecord,
  type RawFeatureBindingRecord,
} from "../services/api/backendBindingContracts";

export const ADDITIVE_FEATURE_KEYS: FeatureKey[] = [
  "artifact.summary",
  "artifact.qa",
  "translate.turn_final",
  "translate.turn_partial",
  "tts.speak",
  "tts.stream",
];

export function buildEmptyBackendProfileEditorValue(): string {
  const seed: RawBackendProfileRecord = {
    id: "profile-id",
    label: "New backend profile",
    kind: "llm",
    base_url: "https://backend.example.com",
    transport: "http",
    auth_strategy: { type: "none", credential_ref: null },
    capabilities: ["artifact.summary"],
    default_model: null,
    enabled: true,
    metadata: {},
    health: { status: "unknown", checked_at: null, message: null },
  };
  return `${JSON.stringify(seed, null, 2)}\n`;
}

export function buildEmptyFeatureBindingEditorValue(
  featureKey: FeatureKey = "artifact.summary"
): string {
  const seed: RawFeatureBindingRecord = {
    feature_key: featureKey,
    primary_backend_profile_id: "profile-id",
    fallback_backend_profile_id: null,
    enabled: true,
    model_override: null,
    timeout_ms: null,
    retry_policy: null,
    degraded_behavior: "disable",
  };
  return `${JSON.stringify(seed, null, 2)}\n`;
}

export function formatBackendProfileEditorValue(profile: BackendProfile): string {
  return `${JSON.stringify(denormalizeBackendProfileRecord(profile), null, 2)}\n`;
}

export function formatFeatureBindingEditorValue(binding: FeatureBinding): string {
  return `${JSON.stringify(denormalizeFeatureBindingRecord(binding), null, 2)}\n`;
}

export function parseBackendProfileEditorValue(value: string): BackendProfile {
  const parsed = JSON.parse(value) as RawBackendProfileRecord;
  return normalizeBackendProfileRecord(parsed);
}

export function parseFeatureBindingEditorValue(value: string): FeatureBinding {
  const parsed = JSON.parse(value) as RawFeatureBindingRecord;
  return normalizeFeatureBindingRecord(parsed);
}
