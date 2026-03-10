import type { BackendBindingRuntimeConfig } from "../app/backendBindingRuntime";
import { resolvePlatformFeatureBinding } from "../app/backendBindingRuntime";
import type {
  PlatformCapabilities,
  PlatformFeatureAvailability,
} from "../app/platformCapabilities";
import type { PlatformFeatureFlags } from "../app/platformRoutes";
import type { FeatureResolutionResult } from "../domain/featureBinding";

export interface TranslateCapabilityPresentation {
  resolution: FeatureResolutionResult | null;
  ready: boolean;
  statusLabelKey: "artifactReady" | "disabled" | "notConfigured";
  helperTextKey: "translationProviderEnabledHelper" | "translationUnavailableHelper";
}

export interface TranslateBindingPresentation {
  shellVisible: boolean;
  availability: PlatformFeatureAvailability;
  finalTranslation: TranslateCapabilityPresentation;
  partialTranslation: TranslateCapabilityPresentation;
}

function buildTranslateCapabilityPresentation(
  featureEnabled: boolean,
  resolution: FeatureResolutionResult | null
): TranslateCapabilityPresentation {
  if (!featureEnabled) {
    return {
      resolution,
      ready: false,
      statusLabelKey: "disabled",
      helperTextKey: "translationUnavailableHelper",
    };
  }

  if (!resolution) {
    return {
      resolution: null,
      ready: false,
      statusLabelKey: "notConfigured",
      helperTextKey: "translationUnavailableHelper",
    };
  }

  if (resolution.status === "ready" || resolution.status === "fallback") {
    return {
      resolution,
      ready: true,
      statusLabelKey: "artifactReady",
      helperTextKey: "translationProviderEnabledHelper",
    };
  }

  return {
    resolution,
    ready: false,
    statusLabelKey: resolution.status === "disabled" ? "disabled" : "notConfigured",
    helperTextKey: "translationUnavailableHelper",
  };
}

export function buildTranslateBindingPresentation(
  flags: PlatformFeatureFlags,
  capabilities: PlatformCapabilities,
  availability: PlatformFeatureAvailability,
  runtime: BackendBindingRuntimeConfig
): TranslateBindingPresentation {
  const shellVisible = flags.realtimeTranslate;
  const finalResolution =
    shellVisible && capabilities.translateTurnFinal
      ? resolvePlatformFeatureBinding("translate.turn_final", runtime)
      : null;
  const partialResolution =
    shellVisible && capabilities.translateTurnPartial
      ? resolvePlatformFeatureBinding("translate.turn_partial", runtime)
      : null;

  return {
    shellVisible,
    availability,
    finalTranslation: buildTranslateCapabilityPresentation(
      availability.translateTurnFinalEnabled,
      finalResolution
    ),
    partialTranslation: buildTranslateCapabilityPresentation(
      availability.translateTurnPartialEnabled,
      partialResolution
    ),
  };
}
