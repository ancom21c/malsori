import type { ArtifactType } from "../domain/session";
import type { BackendProfile } from "../domain/backendProfile";
import type {
  FeatureBinding,
  FeatureKey,
  FeatureResolutionResult,
} from "../domain/featureBinding";
import { resolveFeatureBinding } from "../domain/featureBinding";

export interface ArtifactBindingPresentation {
  featureKey: FeatureKey | null;
  resolution: FeatureResolutionResult | null;
  statusLabelKey: "artifactReady" | "disabled" | "notConfigured" | "misconfigured" | null;
  helperTextKey: "artifactBackendReadyHelper" | "artifactNotRequestedHelper";
  tone: "success" | "default" | "warning";
}

export function getArtifactFeatureKey(type: ArtifactType): FeatureKey | null {
  switch (type) {
    case "summary":
      return "artifact.summary";
    case "qa":
      return "artifact.qa";
    default:
      return null;
  }
}

export function resolveArtifactBindingPresentation(
  artifactType: ArtifactType,
  bindings: readonly FeatureBinding[],
  profiles: readonly BackendProfile[]
): ArtifactBindingPresentation {
  const featureKey = getArtifactFeatureKey(artifactType);
  if (!featureKey) {
    return {
      featureKey: null,
      resolution: null,
      statusLabelKey: null,
      helperTextKey: "artifactNotRequestedHelper",
      tone: "default",
    };
  }

  const resolution = resolveFeatureBinding(featureKey, bindings, profiles);
  switch (resolution.status) {
    case "ready":
    case "fallback":
      return {
        featureKey,
        resolution,
        statusLabelKey: "artifactReady",
        helperTextKey: "artifactBackendReadyHelper",
        tone: "success",
      };
    case "disabled":
      return {
        featureKey,
        resolution,
        statusLabelKey: "disabled",
        helperTextKey: "artifactNotRequestedHelper",
        tone: "default",
      };
    case "misconfigured":
      return {
        featureKey,
        resolution,
        statusLabelKey: "misconfigured",
        helperTextKey: "artifactNotRequestedHelper",
        tone: "warning",
      };
    case "unavailable":
      return {
        featureKey,
        resolution,
        statusLabelKey: "notConfigured",
        helperTextKey: "artifactNotRequestedHelper",
        tone: "default",
      };
  }
}
