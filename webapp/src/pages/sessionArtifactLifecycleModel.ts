import type { SessionArtifact } from "../domain/session";
import type { ArtifactBindingPresentation } from "./artifactBindingModel";

type ArtifactLifecycleHelperKey =
  | "summaryArtifactNotRequestedHelper"
  | "summaryArtifactPendingHelper"
  | "summaryArtifactFailedHelper"
  | "qaArtifactNotRequestedHelper"
  | "qaArtifactPendingHelper"
  | "qaArtifactFailedHelper"
  | "artifactNotRequestedHelper";

export interface SessionArtifactLifecyclePresentation {
  requestStatusLabelKey: "artifactNotRequested" | "artifactPending" | "artifactReady" | "artifactFailed";
  requestTone: "default" | "warning" | "success" | "error";
  helperTextKey: ArtifactLifecycleHelperKey;
  showPromptComposer: boolean;
  showSupportingSnippets: boolean;
}

export function resolveSessionArtifactLifecyclePresentation(
  artifact: SessionArtifact,
  binding: ArtifactBindingPresentation
): SessionArtifactLifecyclePresentation {
  const showPromptComposer = artifact.type === "qa";
  const showSupportingSnippets =
    (artifact.type === "qa" || artifact.type === "summary") &&
    (artifact.supportingSnippets.length > 0 ||
      artifact.requests.some((request) => request.supportingSnippets.length > 0));

  if (artifact.status === "ready") {
    return {
      requestStatusLabelKey: "artifactReady",
      requestTone: "success",
      helperTextKey:
        artifact.type === "qa"
          ? "qaArtifactNotRequestedHelper"
          : artifact.type === "summary"
            ? "summaryArtifactNotRequestedHelper"
            : "artifactNotRequestedHelper",
      showPromptComposer,
      showSupportingSnippets,
    };
  }

  if (artifact.status === "pending") {
    return {
      requestStatusLabelKey: "artifactPending",
      requestTone: "warning",
      helperTextKey:
        artifact.type === "qa"
          ? "qaArtifactPendingHelper"
          : artifact.type === "summary"
            ? "summaryArtifactPendingHelper"
            : "artifactNotRequestedHelper",
      showPromptComposer,
      showSupportingSnippets,
    };
  }

  if (artifact.status === "failed") {
    return {
      requestStatusLabelKey: "artifactFailed",
      requestTone: "error",
      helperTextKey:
        artifact.type === "qa"
          ? "qaArtifactFailedHelper"
          : artifact.type === "summary"
            ? "summaryArtifactFailedHelper"
            : "artifactNotRequestedHelper",
      showPromptComposer,
      showSupportingSnippets,
    };
  }

  return {
    requestStatusLabelKey: "artifactNotRequested",
    requestTone:
      binding.statusLabelKey === "misconfigured"
        ? "warning"
        : binding.statusLabelKey === "artifactReady"
          ? "success"
          : "default",
    helperTextKey:
      artifact.type === "qa"
        ? "qaArtifactNotRequestedHelper"
        : artifact.type === "summary"
          ? "summaryArtifactNotRequestedHelper"
          : "artifactNotRequestedHelper",
    showPromptComposer,
    showSupportingSnippets,
  };
}
