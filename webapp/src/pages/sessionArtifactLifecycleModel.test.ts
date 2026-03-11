import { describe, expect, it } from "vitest";
import { resolveArtifactBindingPresentation } from "./artifactBindingModel";
import { resolveSessionArtifactLifecyclePresentation } from "./sessionArtifactLifecycleModel";
import { createBackendProfile } from "../domain/backendProfile";
import { createFeatureBinding } from "../domain/featureBinding";
import { createDefaultSessionArtifacts } from "../domain/session";

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

describe("sessionArtifactLifecycleModel", () => {
  it("keeps summary and qa artifact lifecycle separate", () => {
    const [summary, , , qa] = createDefaultSessionArtifacts("tx-1");
    const binding = createFeatureBinding({
      featureKey: "artifact.summary",
      primaryBackendProfileId: "summary-primary",
      enabled: true,
    });

    const summaryPresentation = resolveSessionArtifactLifecyclePresentation(
      summary,
      resolveArtifactBindingPresentation("summary", [binding], [summaryProfile])
    );
    const qaPresentation = resolveSessionArtifactLifecyclePresentation(
      qa,
      resolveArtifactBindingPresentation("qa", [], [summaryProfile])
    );

    expect(summaryPresentation.requestStatusLabelKey).toBe("artifactNotRequested");
    expect(summaryPresentation.helperTextKey).toBe("summaryArtifactNotRequestedHelper");
    expect(qaPresentation.helperTextKey).toBe("qaArtifactNotRequestedHelper");
    expect(qaPresentation.showPromptComposer).toBe(true);
  });

  it("surfaces failed qa artifacts without reclassifying transcript state", () => {
    const [, , , qa] = createDefaultSessionArtifacts("tx-1");
    qa.status = "failed";
    qa.errorMessage = "UPSTREAM_TIMEOUT";
    const binding = resolveArtifactBindingPresentation("qa", [], [summaryProfile]);

    const presentation = resolveSessionArtifactLifecyclePresentation(qa, binding);

    expect(presentation.requestStatusLabelKey).toBe("artifactFailed");
    expect(presentation.requestTone).toBe("error");
    expect(presentation.helperTextKey).toBe("qaArtifactFailedHelper");
  });

  it("marks qa provenance visibility when supporting snippets exist", () => {
    const [, , , qa] = createDefaultSessionArtifacts("tx-1");
    qa.supportingSnippets.push({
      id: "snippet-1",
      turnId: "turn-1",
      text: "Relevant source utterance",
      startMs: 0,
      endMs: 1200,
    });

    const presentation = resolveSessionArtifactLifecyclePresentation(
      qa,
      resolveArtifactBindingPresentation("qa", [], [summaryProfile])
    );

    expect(presentation.showSupportingSnippets).toBe(true);
  });

  it("marks summary provenance visibility when supporting snippets exist", () => {
    const [summary] = createDefaultSessionArtifacts("tx-1");
    summary.supportingSnippets.push({
      id: "snippet-1",
      turnId: "turn-1",
      text: "Relevant source utterance",
      startMs: 0,
      endMs: 1200,
    });

    const presentation = resolveSessionArtifactLifecyclePresentation(
      summary,
      resolveArtifactBindingPresentation("summary", [createFeatureBinding({
        featureKey: "artifact.summary",
        primaryBackendProfileId: "summary-primary",
        enabled: true,
      })], [summaryProfile])
    );

    expect(presentation.showSupportingSnippets).toBe(true);
  });
});
