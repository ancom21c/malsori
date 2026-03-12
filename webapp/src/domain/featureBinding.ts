import type { BackendCapability, BackendProfile } from "./backendProfile";
import {
  backendProfileSupportsCapability,
  isBackendHealthStatusUsable,
} from "./backendProfile";

export type FeatureKey =
  | "capture.realtime"
  | "capture.file"
  | "artifact.summary"
  | "artifact.qa"
  | "translate.turn_final"
  | "translate.turn_partial"
  | "tts.speak"
  | "tts.stream";

export interface FeatureBindingRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
}

export type FeatureDegradedBehavior =
  | "hide"
  | "disable"
  | "source_only"
  | "transcript_only"
  | "retry";

export interface FeatureBinding {
  featureKey: FeatureKey;
  primaryBackendProfileId: string;
  fallbackBackendProfileId?: string | null;
  enabled: boolean;
  modelOverride?: string | null;
  timeoutMs?: number;
  retryPolicy?: FeatureBindingRetryPolicy;
  degradedBehavior?: FeatureDegradedBehavior;
}

export type FeatureResolutionStatus =
  | "ready"
  | "fallback"
  | "disabled"
  | "unavailable"
  | "misconfigured";

export type FeatureResolutionReason =
  | "primary_selected"
  | "binding_missing"
  | "binding_disabled"
  | "profile_missing"
  | "capability_mismatch"
  | "primary_unhealthy"
  | "fallback_selected";

export interface FeatureResolutionResult {
  featureKey: FeatureKey;
  status: FeatureResolutionStatus;
  reason: FeatureResolutionReason;
  resolvedBackendProfileId: string | null;
  resolvedModel: string | null;
  requiredCapabilities: BackendCapability[];
  usedFallback: boolean;
}

const FEATURE_CAPABILITY_REQUIREMENTS: Record<FeatureKey, BackendCapability[]> = {
  "capture.realtime": ["stt.realtime"],
  "capture.file": ["stt.file"],
  "artifact.summary": ["artifact.summary"],
  "artifact.qa": ["artifact.qa"],
  "translate.turn_final": ["translate.turn_final"],
  "translate.turn_partial": ["translate.turn_partial"],
  "tts.speak": ["tts.speak"],
  "tts.stream": ["tts.stream"],
};

function getRequiredCapabilities(featureKey: FeatureKey): BackendCapability[] {
  return FEATURE_CAPABILITY_REQUIREMENTS[featureKey];
}

function supportsAllCapabilities(
  profile: BackendProfile,
  requiredCapabilities: BackendCapability[]
): boolean {
  return requiredCapabilities.every((capability) =>
    backendProfileSupportsCapability(profile, capability)
  );
}

function isUsableHealthStatus(profile: BackendProfile): boolean {
  return isBackendHealthStatusUsable(profile.health.status);
}

function resolveProfile(
  profileId: string | null | undefined,
  profilesById: ReadonlyMap<string, BackendProfile>
): BackendProfile | null {
  if (!profileId) {
    return null;
  }
  return profilesById.get(profileId) ?? null;
}

export function createFeatureBinding(
  binding: FeatureBinding
): FeatureBinding {
  return {
    ...binding,
    featureKey: binding.featureKey,
    primaryBackendProfileId: binding.primaryBackendProfileId.trim(),
    fallbackBackendProfileId: binding.fallbackBackendProfileId?.trim() || null,
    enabled: binding.enabled,
    modelOverride: binding.modelOverride?.trim() || null,
  };
}

export function resolveFeatureBinding(
  featureKey: FeatureKey,
  bindings: readonly FeatureBinding[],
  profiles: readonly BackendProfile[]
): FeatureResolutionResult {
  const requiredCapabilities = getRequiredCapabilities(featureKey);
  const binding = bindings.find((candidate) => candidate.featureKey === featureKey);

  if (!binding) {
    return {
      featureKey,
      status: "unavailable",
      reason: "binding_missing",
      resolvedBackendProfileId: null,
      resolvedModel: null,
      requiredCapabilities,
      usedFallback: false,
    };
  }

  if (!binding.enabled) {
    return {
      featureKey,
      status: "disabled",
      reason: "binding_disabled",
      resolvedBackendProfileId: null,
      resolvedModel: null,
      requiredCapabilities,
      usedFallback: false,
    };
  }

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const primaryProfile = resolveProfile(binding.primaryBackendProfileId, profilesById);
  if (!primaryProfile) {
    return {
      featureKey,
      status: "misconfigured",
      reason: "profile_missing",
      resolvedBackendProfileId: null,
      resolvedModel: null,
      requiredCapabilities,
      usedFallback: false,
    };
  }

  const primaryReady =
    supportsAllCapabilities(primaryProfile, requiredCapabilities) &&
    isUsableHealthStatus(primaryProfile) &&
    primaryProfile.enabled;

  if (primaryReady) {
    return {
      featureKey,
      status: "ready",
      reason: "primary_selected",
      resolvedBackendProfileId: primaryProfile.id,
      resolvedModel: binding.modelOverride ?? primaryProfile.defaultModel ?? null,
      requiredCapabilities,
      usedFallback: false,
    };
  }

  const fallbackProfile = resolveProfile(binding.fallbackBackendProfileId, profilesById);
  const fallbackReady =
    fallbackProfile &&
    fallbackProfile.enabled &&
    supportsAllCapabilities(fallbackProfile, requiredCapabilities) &&
    isUsableHealthStatus(fallbackProfile);

  if (fallbackReady) {
    return {
      featureKey,
      status: "fallback",
      reason: "fallback_selected",
      resolvedBackendProfileId: fallbackProfile.id,
      resolvedModel: binding.modelOverride ?? fallbackProfile.defaultModel ?? null,
      requiredCapabilities,
      usedFallback: true,
    };
  }

  const reason = supportsAllCapabilities(primaryProfile, requiredCapabilities)
    ? "primary_unhealthy"
    : "capability_mismatch";

  return {
    featureKey,
    status: reason === "capability_mismatch" ? "misconfigured" : "unavailable",
    reason,
    resolvedBackendProfileId: null,
    resolvedModel: null,
    requiredCapabilities,
    usedFallback: false,
  };
}
