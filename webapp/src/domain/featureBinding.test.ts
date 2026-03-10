import { describe, expect, it } from "vitest";
import { createBackendProfile } from "./backendProfile";
import { createFeatureBinding, resolveFeatureBinding } from "./featureBinding";

describe("createFeatureBinding", () => {
  it("normalizes optional string fields", () => {
    const binding = createFeatureBinding({
      featureKey: "artifact.summary",
      primaryBackendProfileId: " llm-primary ",
      fallbackBackendProfileId: " llm-fallback ",
      enabled: true,
      modelOverride: " gpt-summary ",
    });

    expect(binding).toMatchObject({
      primaryBackendProfileId: "llm-primary",
      fallbackBackendProfileId: "llm-fallback",
      modelOverride: "gpt-summary",
    });
  });
});

describe("resolveFeatureBinding", () => {
  const sttPrimary = createBackendProfile({
    id: "stt-primary",
    label: "STT Primary",
    kind: "stt",
    baseUrl: "https://stt.example.com",
    capabilities: ["stt.realtime", "stt.file"],
    defaultModel: "sommers",
    health: { status: "healthy" },
  });

  const translateFallback = createBackendProfile({
    id: "translate-fallback",
    label: "Translate Fallback",
    kind: "translate",
    baseUrl: "https://translate.example.com",
    capabilities: ["translate.turn_final"],
    defaultModel: "final-only",
    health: { status: "healthy" },
  });

  it("returns ready when the primary backend is capable and healthy", () => {
    const binding = createFeatureBinding({
      featureKey: "capture.realtime",
      primaryBackendProfileId: sttPrimary.id,
      enabled: true,
    });

    expect(resolveFeatureBinding(binding.featureKey, [binding], [sttPrimary])).toMatchObject({
      status: "ready",
      resolvedBackendProfileId: "stt-primary",
      resolvedModel: "sommers",
      usedFallback: false,
    });
  });

  it("returns fallback when the primary backend is unavailable and fallback is valid", () => {
    const translatePrimary = createBackendProfile({
      id: "translate-primary",
      label: "Translate Primary",
      kind: "translate",
      baseUrl: "https://translate-primary.example.com",
      capabilities: ["translate.turn_final"],
      health: { status: "unreachable" },
    });
    const binding = createFeatureBinding({
      featureKey: "translate.turn_final",
      primaryBackendProfileId: translatePrimary.id,
      fallbackBackendProfileId: translateFallback.id,
      enabled: true,
    });

    expect(
      resolveFeatureBinding(binding.featureKey, [binding], [translatePrimary, translateFallback])
    ).toMatchObject({
      status: "fallback",
      resolvedBackendProfileId: "translate-fallback",
      usedFallback: true,
    });
  });

  it("returns misconfigured when the primary backend lacks required capabilities", () => {
    const binding = createFeatureBinding({
      featureKey: "artifact.summary",
      primaryBackendProfileId: sttPrimary.id,
      enabled: true,
    });

    expect(resolveFeatureBinding(binding.featureKey, [binding], [sttPrimary])).toMatchObject({
      status: "misconfigured",
      reason: "capability_mismatch",
    });
  });

  it("returns disabled when the binding is intentionally off", () => {
    const binding = createFeatureBinding({
      featureKey: "tts.speak",
      primaryBackendProfileId: "tts-primary",
      enabled: false,
    });

    expect(resolveFeatureBinding(binding.featureKey, [binding], [])).toMatchObject({
      status: "disabled",
      reason: "binding_disabled",
    });
  });

  it("returns unavailable when no binding exists", () => {
    expect(resolveFeatureBinding("artifact.qa", [], [sttPrimary])).toMatchObject({
      status: "unavailable",
      reason: "binding_missing",
    });
  });
});
