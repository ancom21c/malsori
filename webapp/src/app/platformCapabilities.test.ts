import { describe, expect, it } from "vitest";
import {
  derivePlatformFeatureAvailability,
  type PlatformCapabilities,
} from "./platformCapabilities";
import type { PlatformFeatureFlags } from "./platformRoutes";

const disabledFlags: PlatformFeatureFlags = {
  modeSplitNavigation: true,
  sessionArtifacts: false,
  realtimeTranslate: false,
};

const enabledFlags: PlatformFeatureFlags = {
  modeSplitNavigation: true,
  sessionArtifacts: true,
  realtimeTranslate: true,
};

const capabilityMatrix: PlatformCapabilities = {
  captureRealtime: true,
  captureFile: true,
  translateTurnFinal: true,
  translateTurnPartial: false,
  artifactSummary: true,
  artifactQa: false,
};

describe("platformCapabilities", () => {
  it("keeps additive features disabled when flags are off", () => {
    expect(
      derivePlatformFeatureAvailability(disabledFlags, capabilityMatrix)
    ).toEqual({
      captureRealtimeEnabled: true,
      captureFileEnabled: true,
      translateShellVisible: false,
      translateTurnFinalEnabled: false,
      translateTurnPartialEnabled: false,
      sessionArtifactsVisible: false,
      artifactSummaryEnabled: false,
      artifactQaEnabled: false,
    });
  });

  it("enables only the capabilities explicitly supported by the provider matrix", () => {
    expect(
      derivePlatformFeatureAvailability(enabledFlags, capabilityMatrix)
    ).toEqual({
      captureRealtimeEnabled: true,
      captureFileEnabled: true,
      translateShellVisible: true,
      translateTurnFinalEnabled: true,
      translateTurnPartialEnabled: false,
      sessionArtifactsVisible: true,
      artifactSummaryEnabled: true,
      artifactQaEnabled: false,
    });
  });
});
