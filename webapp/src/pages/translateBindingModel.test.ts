import { describe, expect, it } from "vitest";
import { createBackendProfile } from "../domain/backendProfile";
import { createFeatureBinding } from "../domain/featureBinding";
import { derivePlatformFeatureAvailability, type PlatformCapabilities } from "../app/platformCapabilities";
import type { PlatformFeatureFlags } from "../app/platformRoutes";
import { buildTranslateBindingPresentation } from "./translateBindingModel";

const enabledFlags: PlatformFeatureFlags = {
  modeSplitNavigation: true,
  sessionArtifacts: false,
  realtimeTranslate: true,
};

const enabledCapabilities: PlatformCapabilities = {
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

describe("translateBindingModel", () => {
  it("keeps shell visibility separate from binding readiness", () => {
    const availability = derivePlatformFeatureAvailability(enabledFlags, enabledCapabilities);

    const presentation = buildTranslateBindingPresentation(
      enabledFlags,
      enabledCapabilities,
      availability,
      { profiles: [], bindings: [] }
    );

    expect(presentation.shellVisible).toBe(true);
    expect(presentation.finalTranslation.ready).toBe(false);
    expect(presentation.finalTranslation.statusLabelKey).toBe("notConfigured");
  });

  it("marks final translation ready when a compatible binding exists", () => {
    const availability = derivePlatformFeatureAvailability(enabledFlags, enabledCapabilities);

    const presentation = buildTranslateBindingPresentation(
      enabledFlags,
      enabledCapabilities,
      availability,
      {
        profiles: [translateProfile],
        bindings: [
          createFeatureBinding({
            featureKey: "translate.turn_final",
            primaryBackendProfileId: "translate-primary",
            enabled: true,
          }),
        ],
      }
    );

    expect(presentation.finalTranslation.ready).toBe(true);
    expect(presentation.finalTranslation.statusLabelKey).toBe("artifactReady");
    expect(presentation.partialTranslation.statusLabelKey).toBe("notConfigured");
  });

  it("surfaces disabled capabilities separately from binding readiness", () => {
    const flags = enabledFlags;
    const capabilities = {
      ...enabledCapabilities,
      translateTurnFinal: false,
      translateTurnPartial: false,
    };
    const availability = derivePlatformFeatureAvailability(flags, capabilities);

    const presentation = buildTranslateBindingPresentation(flags, capabilities, availability, {
      profiles: [translateProfile],
      bindings: [
        createFeatureBinding({
          featureKey: "translate.turn_final",
          primaryBackendProfileId: "translate-primary",
          enabled: true,
        }),
      ],
    });

    expect(presentation.finalTranslation.statusLabelKey).toBe("disabled");
    expect(presentation.finalTranslation.ready).toBe(false);
  });
});
