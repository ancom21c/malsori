import { describe, expect, it } from "vitest";
import {
  buildEmptyBackendProfileEditorValue,
  buildEmptyFeatureBindingEditorValue,
  formatBackendProfileEditorValue,
  formatFeatureBindingEditorValue,
  parseBackendProfileEditorValue,
  parseFeatureBindingEditorValue,
} from "./settingsBackendBindingModel";
import { createBackendProfile } from "../domain/backendProfile";
import { createFeatureBinding } from "../domain/featureBinding";

describe("settingsBackendBindingModel", () => {
  it("builds parseable default editor seeds", () => {
    expect(parseBackendProfileEditorValue(buildEmptyBackendProfileEditorValue()).id).toBe(
      "profile-id"
    );
    expect(parseFeatureBindingEditorValue(buildEmptyFeatureBindingEditorValue()).featureKey).toBe(
      "artifact.summary"
    );
  });

  it("round-trips profile and binding editor payloads", () => {
    const profile = createBackendProfile({
      id: "summary-primary",
      label: "Summary primary",
      kind: "llm",
      baseUrl: "https://summary.example.com",
      transport: "http",
      authStrategy: { type: "none", credentialRef: null },
      capabilities: ["artifact.summary"],
      metadata: { environment: "dev" },
      health: { status: "healthy" },
    });
    const binding = createFeatureBinding({
      featureKey: "artifact.summary",
      primaryBackendProfileId: "summary-primary",
      enabled: true,
      degradedBehavior: "disable",
    });

    expect(parseBackendProfileEditorValue(formatBackendProfileEditorValue(profile))).toMatchObject({
      id: "summary-primary",
      capabilities: ["artifact.summary"],
    });
    expect(parseFeatureBindingEditorValue(formatFeatureBindingEditorValue(binding))).toMatchObject({
      featureKey: "artifact.summary",
      primaryBackendProfileId: "summary-primary",
    });
  });
});
