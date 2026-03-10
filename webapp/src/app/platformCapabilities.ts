import { platformFeatureFlags, type PlatformFeatureFlags } from "./platformRoutes";

export interface PlatformCapabilities {
  captureRealtime: boolean;
  captureFile: boolean;
  translateTurnFinal: boolean;
  translateTurnPartial: boolean;
  artifactSummary: boolean;
  artifactQa: boolean;
}

export interface PlatformFeatureAvailability {
  captureRealtimeEnabled: boolean;
  captureFileEnabled: boolean;
  translateShellVisible: boolean;
  translateTurnFinalEnabled: boolean;
  translateTurnPartialEnabled: boolean;
  sessionArtifactsVisible: boolean;
  artifactSummaryEnabled: boolean;
  artifactQaEnabled: boolean;
}

function resolveCapability(value: string | undefined, defaultValue: boolean) {
  if (!value) {
    return defaultValue;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const platformCapabilities: PlatformCapabilities = {
  captureRealtime: resolveCapability(import.meta.env.VITE_CAP_CAPTURE_REALTIME, true),
  captureFile: resolveCapability(import.meta.env.VITE_CAP_CAPTURE_FILE, true),
  translateTurnFinal: resolveCapability(import.meta.env.VITE_CAP_TRANSLATE_TURN_FINAL, false),
  translateTurnPartial: resolveCapability(import.meta.env.VITE_CAP_TRANSLATE_TURN_PARTIAL, false),
  artifactSummary: resolveCapability(import.meta.env.VITE_CAP_ARTIFACT_SUMMARY, false),
  artifactQa: resolveCapability(import.meta.env.VITE_CAP_ARTIFACT_QA, false),
};

export function derivePlatformFeatureAvailability(
  flags: PlatformFeatureFlags = platformFeatureFlags,
  capabilities: PlatformCapabilities = platformCapabilities
): PlatformFeatureAvailability {
  return {
    captureRealtimeEnabled: capabilities.captureRealtime,
    captureFileEnabled: capabilities.captureFile,
    translateShellVisible: flags.realtimeTranslate,
    translateTurnFinalEnabled: flags.realtimeTranslate && capabilities.translateTurnFinal,
    translateTurnPartialEnabled: flags.realtimeTranslate && capabilities.translateTurnPartial,
    sessionArtifactsVisible: flags.sessionArtifacts,
    artifactSummaryEnabled: flags.sessionArtifacts && capabilities.artifactSummary,
    artifactQaEnabled: flags.sessionArtifacts && capabilities.artifactQa,
  };
}
