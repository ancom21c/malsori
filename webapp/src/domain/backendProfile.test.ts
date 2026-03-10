import { describe, expect, it } from "vitest";
import {
  backendProfileSupportsCapability,
  createBackendProfile,
} from "./backendProfile";

describe("createBackendProfile", () => {
  it("normalizes core fields and deduplicates capabilities", () => {
    const profile = createBackendProfile({
      id: " stt-cloud ",
      label: " RTZR Cloud ",
      kind: "stt",
      baseUrl: "https://openapi.vito.ai/",
      capabilities: ["stt.file", "stt.realtime", "stt.file"],
      metadata: {
        region: " ap-northeast-2 ",
        empty: "   ",
      },
      defaultModel: " sommers ",
    });

    expect(profile).toMatchObject({
      id: "stt-cloud",
      label: "RTZR Cloud",
      kind: "stt",
      baseUrl: "https://openapi.vito.ai",
      transport: "http",
      defaultModel: "sommers",
      enabled: true,
      metadata: {
        region: "ap-northeast-2",
      },
      health: {
        status: "unknown",
      },
    });
    expect(profile.capabilities).toEqual(["stt.file", "stt.realtime"]);
  });

  it("supports non-STT profile kinds under the same contract", () => {
    const translate = createBackendProfile({
      id: "translate-primary",
      label: "Translate Primary",
      kind: "translate",
      baseUrl: "https://translate.example.com",
      capabilities: ["translate.turn_final", "translate.turn_partial"],
    });
    const tts = createBackendProfile({
      id: "tts-primary",
      label: "TTS Primary",
      kind: "tts",
      baseUrl: "https://tts.example.com",
      capabilities: ["tts.speak", "tts.stream"],
    });

    expect(translate.kind).toBe("translate");
    expect(tts.kind).toBe("tts");
    expect(tts.capabilities).toContain("tts.stream");
  });

  it("requires a credential reference for auth strategies that depend on secrets", () => {
    expect(() =>
      createBackendProfile({
        id: "summary-primary",
        label: "Summary Primary",
        kind: "llm",
        baseUrl: "https://llm.example.com",
        authStrategy: {
          type: "bearer_secret_ref",
        },
      })
    ).toThrowError("BACKEND_PROFILE_CREDENTIAL_REF_REQUIRED");
  });
});

describe("backendProfileSupportsCapability", () => {
  it("checks whether a profile advertises a capability", () => {
    const profile = createBackendProfile({
      id: "qa-backend",
      label: "QA Backend",
      kind: "llm",
      baseUrl: "https://llm.example.com",
      capabilities: ["artifact.qa"],
    });

    expect(backendProfileSupportsCapability(profile, "artifact.qa")).toBe(true);
    expect(backendProfileSupportsCapability(profile, "artifact.summary")).toBe(false);
  });
});
