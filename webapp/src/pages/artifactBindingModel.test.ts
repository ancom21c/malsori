import { describe, expect, it } from "vitest";
import { createBackendProfile } from "../domain/backendProfile";
import { createFeatureBinding } from "../domain/featureBinding";
import {
  getArtifactFeatureKey,
  resolveArtifactBindingPresentation,
} from "./artifactBindingModel";

const summaryProfile = createBackendProfile({
  id: "summary-primary",
  label: "Summary",
  kind: "llm",
  baseUrl: "https://summary.example.com",
  transport: "http",
  authStrategy: { type: "none", credentialRef: null },
  capabilities: ["artifact.summary", "artifact.qa"],
  enabled: true,
  metadata: {},
  health: { status: "healthy" },
});

describe("artifactBindingModel", () => {
  it("maps only summary and qa artifacts to feature keys", () => {
    expect(getArtifactFeatureKey("summary")).toBe("artifact.summary");
    expect(getArtifactFeatureKey("qa")).toBe("artifact.qa");
    expect(getArtifactFeatureKey("action_items")).toBeNull();
  });

  it("marks ready artifacts when a compatible backend is bound", () => {
    const binding = createFeatureBinding({
      featureKey: "artifact.summary",
      primaryBackendProfileId: "summary-primary",
      enabled: true,
    });

    const presentation = resolveArtifactBindingPresentation("summary", [binding], [summaryProfile]);

    expect(presentation.statusLabelKey).toBe("artifactReady");
    expect(presentation.helperTextKey).toBe("artifactBackendReadyHelper");
  });

  it("marks missing bindings as not configured", () => {
    const presentation = resolveArtifactBindingPresentation("qa", [], [summaryProfile]);

    expect(presentation.statusLabelKey).toBe("notConfigured");
    expect(presentation.helperTextKey).toBe("artifactNotRequestedHelper");
  });

  it("surfaces capability mismatches as misconfigured", () => {
    const binding = createFeatureBinding({
      featureKey: "artifact.summary",
      primaryBackendProfileId: "summary-primary",
      enabled: true,
    });
    const qaOnlyProfile = createBackendProfile({
      ...summaryProfile,
      id: "qa-only",
      capabilities: ["artifact.qa"],
    });

    const presentation = resolveArtifactBindingPresentation("summary", [binding], [qaOnlyProfile]);

    expect(presentation.statusLabelKey).toBe("misconfigured");
    expect(presentation.tone).toBe("warning");
  });
});
