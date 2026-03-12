import {
  isBackendProfileOperational,
  type BackendHealthStatus,
  type BackendProfile,
} from "../domain/backendProfile";
import { resolveFeatureBinding, type FeatureBinding, type FeatureKey } from "../domain/featureBinding";

export type BackendInspectorNoticeCode =
  | "binding_disabled"
  | "primary_profile_missing"
  | "primary_capability_mismatch"
  | "primary_not_ready"
  | "fallback_profile_missing"
  | "fallback_not_ready"
  | "fallback_active";

export interface BackendInspectorNotice {
  code: BackendInspectorNoticeCode;
  severity: "info" | "warning" | "error";
}

export function resolveSelectedBackendProfile(
  profiles: readonly BackendProfile[],
  selectedProfileId: string | null
): BackendProfile | null {
  if (!selectedProfileId) {
    return null;
  }
  return profiles.find((profile) => profile.id === selectedProfileId) ?? null;
}

export function getBackendHealthTone(
  status: BackendHealthStatus
): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "healthy":
      return "success";
    case "degraded":
    case "unknown":
      return "warning";
    case "unreachable":
    case "misconfigured":
      return "error";
    default:
      return "default";
  }
}

export function getBackendHealthAlertSeverity(
  status: BackendHealthStatus
): "success" | "warning" | "error" {
  if (status === "healthy") {
    return "success";
  }
  if (status === "unreachable" || status === "misconfigured") {
    return "error";
  }
  return "warning";
}

export function getBindingResolutionTone(
  status: ReturnType<typeof resolveFeatureBinding>["status"]
): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "ready":
      return "success";
    case "fallback":
    case "disabled":
      return "warning";
    case "unavailable":
    case "misconfigured":
      return "error";
    default:
      return "default";
  }
}

export function buildBindingInspectorState(input: {
  bindings: readonly FeatureBinding[];
  selectedBindingKey: FeatureKey | null;
  profiles: readonly BackendProfile[];
}): {
  binding: FeatureBinding | null;
  primaryProfile: BackendProfile | null;
  fallbackProfile: BackendProfile | null;
  resolution: ReturnType<typeof resolveFeatureBinding> | null;
  notices: BackendInspectorNotice[];
} {
  const binding =
    input.selectedBindingKey === null
      ? null
      : input.bindings.find((candidate) => candidate.featureKey === input.selectedBindingKey) ??
        null;

  if (!binding) {
    return {
      binding: null,
      primaryProfile: null,
      fallbackProfile: null,
      resolution: null,
      notices: [],
    };
  }

  const profilesById = new Map(input.profiles.map((profile) => [profile.id, profile]));
  const primaryProfile = profilesById.get(binding.primaryBackendProfileId) ?? null;
  const fallbackProfile = binding.fallbackBackendProfileId
    ? profilesById.get(binding.fallbackBackendProfileId) ?? null
    : null;
  const resolution = resolveFeatureBinding(binding.featureKey, input.bindings, input.profiles);
  const notices: BackendInspectorNotice[] = [];

  if (!binding.enabled) {
    notices.push({ code: "binding_disabled", severity: "warning" });
  }
  if (!primaryProfile) {
    notices.push({ code: "primary_profile_missing", severity: "error" });
  } else {
    const missingCapability = resolution.requiredCapabilities.some(
      (capability) => !primaryProfile.capabilities.includes(capability)
    );
    if (missingCapability) {
      notices.push({ code: "primary_capability_mismatch", severity: "error" });
    } else if (!isBackendProfileOperational(primaryProfile)) {
      notices.push({ code: "primary_not_ready", severity: "warning" });
    }
  }

  if (binding.fallbackBackendProfileId) {
    if (!fallbackProfile) {
      notices.push({ code: "fallback_profile_missing", severity: "warning" });
    } else if (!isBackendProfileOperational(fallbackProfile)) {
      notices.push({ code: "fallback_not_ready", severity: "warning" });
    }
  } else if (resolution.reason === "primary_unhealthy") {
    notices.push({ code: "fallback_profile_missing", severity: "info" });
  }

  if (resolution.usedFallback) {
    notices.push({ code: "fallback_active", severity: "info" });
  }

  return {
    binding,
    primaryProfile,
    fallbackProfile,
    resolution,
    notices,
  };
}
