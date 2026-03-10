import type { BackendEndpointPreset } from "../data/app-db";
import {
  createBackendProfile,
  type BackendProfile,
} from "./backendProfile";
import {
  createFeatureBinding,
  type FeatureBinding,
} from "./featureBinding";

export type SttCompatibilitySource = "preset" | "server-default" | "unknown";

export interface SttCompatibilitySelection {
  source: SttCompatibilitySource;
  selectedProfileId: string;
  selectedPresetId: string | null;
  legacyPresetId: string | null;
  name: string;
}

export interface SttCompatibilityState {
  profiles: BackendProfile[];
  bindings: FeatureBinding[];
  selection: SttCompatibilitySelection;
}

export const IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID = "compat-stt-server-default";

function createSttCapabilities() {
  return ["stt.file", "stt.realtime"] as const;
}

export function createImplicitSttServerDefaultProfile(
  publicApiBaseUrl: string
): BackendProfile {
  return createBackendProfile({
    id: IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID,
    label: "Server Default STT",
    kind: "stt",
    baseUrl: publicApiBaseUrl,
    capabilities: [...createSttCapabilities()],
    metadata: {
      source: "server-default",
    },
  });
}

export function mapBackendEndpointPresetToBackendProfile(
  preset: BackendEndpointPreset
): BackendProfile {
  const hasClientPair = Boolean(
    preset.clientId?.trim().length && preset.clientSecret?.trim().length
  );

  return createBackendProfile({
    id: `preset:${preset.id}`,
    label: preset.name,
    kind: "stt",
    baseUrl: preset.apiBaseUrl,
    authStrategy: {
      type: hasClientPair ? "provider_native" : "none",
    },
    capabilities: [...createSttCapabilities()],
    enabled: true,
    metadata: {
      legacyPresetId: preset.id,
      deployment: preset.deployment,
      verifySsl: String(preset.verifySsl ?? true),
      source: "preset",
      hasClientId: String(Boolean(preset.clientId?.trim().length)),
      hasClientSecret: String(Boolean(preset.clientSecret?.trim().length)),
    },
  });
}

function createCaptureBindings(profileId: string): FeatureBinding[] {
  return [
    createFeatureBinding({
      featureKey: "capture.realtime",
      primaryBackendProfileId: profileId,
      enabled: true,
      degradedBehavior: "retry",
    }),
    createFeatureBinding({
      featureKey: "capture.file",
      primaryBackendProfileId: profileId,
      enabled: true,
      degradedBehavior: "disable",
    }),
  ];
}

export function deriveSttCompatibilityState(options: {
  publicApiBaseUrl: string;
  activeBackendPresetId?: string | null;
  backendPresets: BackendEndpointPreset[];
}): SttCompatibilityState {
  const implicitProfile = createImplicitSttServerDefaultProfile(options.publicApiBaseUrl);
  const presetProfiles = options.backendPresets.map(mapBackendEndpointPresetToBackendProfile);
  const profiles = [implicitProfile, ...presetProfiles];

  if (!options.activeBackendPresetId) {
    return {
      profiles,
      bindings: createCaptureBindings(implicitProfile.id),
      selection: {
        source: "server-default",
        selectedProfileId: implicitProfile.id,
        selectedPresetId: null,
        legacyPresetId: null,
        name: implicitProfile.label,
      },
    };
  }

  const matchedPreset = options.backendPresets.find(
    (preset) => preset.id === options.activeBackendPresetId
  );

  if (!matchedPreset) {
    return {
      profiles,
      bindings: createCaptureBindings(implicitProfile.id),
      selection: {
        source: "unknown",
        selectedProfileId: implicitProfile.id,
        selectedPresetId: null,
        legacyPresetId: options.activeBackendPresetId,
        name: "Unknown Legacy STT Selection",
      },
    };
  }

  const presetProfileId = `preset:${matchedPreset.id}`;
  return {
    profiles,
    bindings: createCaptureBindings(presetProfileId),
    selection: {
      source: "preset",
      selectedProfileId: presetProfileId,
      selectedPresetId: matchedPreset.id,
      legacyPresetId: matchedPreset.id,
      name: matchedPreset.name,
    },
  };
}
