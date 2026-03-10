import { describe, expect, it } from "vitest";
import { createBackendProfile } from "./backendProfile";
import { createFeatureBinding } from "./featureBinding";
import {
  buildTtsBindingPresentation,
  createFailedTtsResult,
} from "./ttsContract";

const ttsProfile = createBackendProfile({
  id: "tts-primary",
  label: "TTS",
  kind: "tts",
  baseUrl: "https://tts.example.com",
  transport: "http",
  authStrategy: { type: "none", credentialRef: null },
  capabilities: ["tts.speak", "tts.stream"],
  enabled: true,
  metadata: {},
  health: { status: "healthy" },
});

describe("ttsContract", () => {
  it("resolves tts speak and stream readiness through the shared binding model", () => {
    const bindings = [
      createFeatureBinding({
        featureKey: "tts.speak",
        primaryBackendProfileId: "tts-primary",
        enabled: true,
      }),
      createFeatureBinding({
        featureKey: "tts.stream",
        primaryBackendProfileId: "tts-primary",
        enabled: true,
      }),
    ];

    expect(buildTtsBindingPresentation("tts.speak", bindings, [ttsProfile]).ready).toBe(true);
    expect(buildTtsBindingPresentation("tts.stream", bindings, [ttsProfile]).ready).toBe(true);
  });

  it("keeps missing tts bindings in the shared unavailable state", () => {
    const presentation = buildTtsBindingPresentation("tts.speak", [], [ttsProfile]);

    expect(presentation.ready).toBe(false);
    expect(presentation.resolution.reason).toBe("binding_missing");
  });

  it("creates failed tts results without inventing new ad-hoc fields", () => {
    const result = createFailedTtsResult("tts.stream", "provider offline", "tts-primary");

    expect(result.state).toBe("failed");
    expect(result.format).toBe("pcm_chunks");
    expect(result.backendProfileId).toBe("tts-primary");
  });
});
