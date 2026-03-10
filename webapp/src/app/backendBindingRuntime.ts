import {
  normalizeBackendProfileRecord,
  normalizeFeatureBindingRecord,
  type RawBackendProfileRecord,
  type RawFeatureBindingRecord,
} from "../services/api/backendBindingContracts";
import { createBackendProfile, type BackendProfile } from "../domain/backendProfile";
import {
  createFeatureBinding,
  resolveFeatureBinding,
  type FeatureBinding,
  type FeatureKey,
  type FeatureResolutionResult,
} from "../domain/featureBinding";

export interface BackendBindingRuntimeConfig {
  profiles: BackendProfile[];
  bindings: FeatureBinding[];
}

function parseJsonArray<T>(raw: string | undefined): T[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseBackendBindingRuntimeConfig(
  rawProfiles: string | undefined,
  rawBindings: string | undefined
): BackendBindingRuntimeConfig {
  const profiles = parseJsonArray<RawBackendProfileRecord>(rawProfiles)
    .map((entry) => createBackendProfile(normalizeBackendProfileRecord(entry)));
  const bindings = parseJsonArray<RawFeatureBindingRecord>(rawBindings)
    .map((entry) => createFeatureBinding(normalizeFeatureBindingRecord(entry)));

  return {
    profiles,
    bindings,
  };
}

export const platformBackendBindingRuntime = parseBackendBindingRuntimeConfig(
  import.meta.env.VITE_BACKEND_PROFILES_JSON,
  import.meta.env.VITE_FEATURE_BINDINGS_JSON
);

export function resolvePlatformFeatureBinding(
  featureKey: FeatureKey,
  runtime: BackendBindingRuntimeConfig = platformBackendBindingRuntime
): FeatureResolutionResult {
  return resolveFeatureBinding(featureKey, runtime.bindings, runtime.profiles);
}

export function findPlatformBackendProfile(
  profileId: string | null | undefined,
  runtime: BackendBindingRuntimeConfig = platformBackendBindingRuntime
): BackendProfile | null {
  if (!profileId) {
    return null;
  }
  return runtime.profiles.find((profile) => profile.id === profileId) ?? null;
}
