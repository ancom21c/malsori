import type { TranslateBindingPresentation } from "./translateBindingModel";

export interface TranslateWorkspaceLane {
  id: "final" | "partial";
  sourceTitleKey: "finalTurnsOnly" | "streamingPartialTranslation";
  sourceHelperKey:
    | "translationFinalSourceHelper"
    | "translationPartialSourceHelper";
  translationStatusLabelKey: TranslateBindingPresentation["finalTranslation"]["statusLabelKey"];
  translationHelperTextKey: TranslateBindingPresentation["finalTranslation"]["helperTextKey"];
  translationReady: boolean;
}

export interface TranslateWorkspacePresentation {
  showShell: boolean;
  routeLabelKey: "autoDetectToEnglish";
  sourcePrimaryHelperKey: "sourceTranscriptPrimaryHelper";
  sourceFallbackHelperKey: "sourceOnlyFallback";
  lanes: TranslateWorkspaceLane[];
}

export function buildTranslateWorkspacePresentation(
  binding: TranslateBindingPresentation
): TranslateWorkspacePresentation {
  return {
    showShell: binding.shellVisible,
    routeLabelKey: "autoDetectToEnglish",
    sourcePrimaryHelperKey: "sourceTranscriptPrimaryHelper",
    sourceFallbackHelperKey: "sourceOnlyFallback",
    lanes: [
      {
        id: "final",
        sourceTitleKey: "finalTurnsOnly",
        sourceHelperKey: "translationFinalSourceHelper",
        translationStatusLabelKey: binding.finalTranslation.statusLabelKey,
        translationHelperTextKey: binding.finalTranslation.helperTextKey,
        translationReady: binding.finalTranslation.ready,
      },
      {
        id: "partial",
        sourceTitleKey: "streamingPartialTranslation",
        sourceHelperKey: "translationPartialSourceHelper",
        translationStatusLabelKey: binding.partialTranslation.statusLabelKey,
        translationHelperTextKey: binding.partialTranslation.helperTextKey,
        translationReady: binding.partialTranslation.ready,
      },
    ],
  };
}
