import { describe, expect, it } from "vitest";
import { createBackendProfile } from "../domain/backendProfile";
import { createFeatureBinding } from "../domain/featureBinding";
import { derivePlatformFeatureAvailability, type PlatformCapabilities } from "../app/platformCapabilities";
import type { PlatformFeatureFlags } from "../app/platformRoutes";
import { buildTranslateBindingPresentation } from "./translateBindingModel";
import { buildTranslateWorkspacePresentation } from "./translateWorkspaceModel";

const flags: PlatformFeatureFlags = {
  modeSplitNavigation: true,
  sessionArtifacts: false,
  realtimeTranslate: true,
};

const capabilities: PlatformCapabilities = {
  captureRealtime: true,
  captureFile: true,
  translateTurnFinal: true,
  translateTurnPartial: true,
  artifactSummary: false,
  artifactQa: false,
};

const translateProfile = createBackendProfile({
  id: "translate-primary",
  label: "Translate",
  kind: "translate",
  baseUrl: "https://translate.example.com",
  transport: "http",
  authStrategy: { type: "none", credentialRef: null },
  capabilities: ["translate.turn_final", "translate.turn_partial"],
  enabled: true,
  metadata: {},
  health: { status: "healthy" },
});

describe("translateWorkspaceModel", () => {
  it("keeps source lanes visible even when translation bindings are missing", () => {
    const availability = derivePlatformFeatureAvailability(flags, capabilities);
    const binding = buildTranslateBindingPresentation(flags, capabilities, availability, {
      profiles: [],
      bindings: [],
    });

    const presentation = buildTranslateWorkspacePresentation(binding);
    expect(presentation.showShell).toBe(true);
    expect(presentation.lanes).toHaveLength(2);
    expect(presentation.turnGroups).toHaveLength(2);
    expect(presentation.lanes[0].translationReady).toBe(false);
    expect(presentation.lanes[0].translationStatusLabelKey).toBe("notConfigured");
    expect(presentation.turnGroups[0].translationVariant.status).toBe("pending");
  });

  it("marks the final lane ready when a final translation binding resolves", () => {
    const availability = derivePlatformFeatureAvailability(flags, capabilities);
    const binding = buildTranslateBindingPresentation(flags, capabilities, availability, {
      profiles: [translateProfile],
      bindings: [
        createFeatureBinding({
          featureKey: "translate.turn_final",
          primaryBackendProfileId: "translate-primary",
          enabled: true,
        }),
      ],
    });

    const presentation = buildTranslateWorkspacePresentation(binding);
    expect(presentation.lanes[0].translationReady).toBe(true);
    expect(presentation.lanes[0].translationStatusLabelKey).toBe("artifactReady");
    expect(presentation.lanes[1].translationReady).toBe(false);
    expect(presentation.turnGroups[0].translationVariant.status).toBe("final");
    expect(presentation.turnGroups[1].translationVariant.status).toBe("pending");
  });
});
