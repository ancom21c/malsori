import type { SessionTurn, SessionTurnVariant, TurnVariantStatus } from "../domain/session";
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

export interface TranslateWorkspaceTurnGroupPresentation {
  id: string;
  speakerLabel: string;
  sourceLanguageLabel: string;
  sourceStatusLabelKey: "finalTurnsOnly" | "streamingPartialTranslation";
  sourceText: string;
  translationVariant: {
    languageLabel: string;
    status: TurnVariantStatus;
    statusLabelKey:
      | "translationVariantFinal"
      | "translationVariantPartial"
      | "translationPending"
      | "artifactFailed";
    text: string;
    helperTextKey:
      | "translationProviderEnabledHelper"
      | "translationVariantPendingHelper"
      | "translationUnavailableHelper";
    ready: boolean;
  };
}

export interface TranslateWorkspacePresentation {
  showShell: boolean;
  routeLabelKey: "autoDetectToEnglish";
  sourcePrimaryHelperKey: "sourceTranscriptPrimaryHelper";
  sourceFallbackHelperKey: "sourceOnlyFallback";
  lanes: TranslateWorkspaceLane[];
  turnGroups: TranslateWorkspaceTurnGroupPresentation[];
}

function mapVariantStatusLabelKey(
  status: TurnVariantStatus
): TranslateWorkspaceTurnGroupPresentation["translationVariant"]["statusLabelKey"] {
  switch (status) {
    case "final":
      return "translationVariantFinal";
    case "partial":
      return "translationVariantPartial";
    case "failed":
      return "artifactFailed";
    case "pending":
    default:
      return "translationPending";
  }
}

function buildSeedTurns(binding: TranslateBindingPresentation): SessionTurn[] {
  const finalVariantStatus: TurnVariantStatus = binding.finalTranslation.ready ? "final" : "pending";
  const partialVariantStatus: TurnVariantStatus = binding.partialTranslation.ready
    ? "partial"
    : "pending";

  const finalVariant: SessionTurnVariant = {
    id: "variant-final",
    type: "translation",
    language: "en",
    text: binding.finalTranslation.ready
      ? "Translated final turns attach directly under the authoritative source turn."
      : "",
    status: finalVariantStatus,
  };

  const partialVariant: SessionTurnVariant = {
    id: "variant-partial",
    type: "translation",
    language: "en",
    text: binding.partialTranslation.ready
      ? "Partial translation can stream underneath the active source turn."
      : "",
    status: partialVariantStatus,
  };

  return [
    {
      id: "turn-final",
      sessionId: "translate-shell",
      speakerLabel: "Speaker A",
      sourceLanguage: "auto",
      startMs: 0,
      endMs: 3200,
      text: "Source turns stay authoritative even when translation arrives later.",
      status: "final",
      variants: [finalVariant],
    },
    {
      id: "turn-partial",
      sessionId: "translate-shell",
      speakerLabel: "Speaker B",
      sourceLanguage: "auto",
      startMs: 3400,
      endMs: 5200,
      text: "Partial source capture continues while translated variants catch up.",
      status: "partial",
      variants: [partialVariant],
    },
  ];
}

function buildTurnGroups(
  binding: TranslateBindingPresentation
): TranslateWorkspaceTurnGroupPresentation[] {
  return buildSeedTurns(binding).map((turn) => {
    const translationVariant =
      turn.variants.find((variant) => variant.type === "translation") ?? null;
    const variantStatus = translationVariant?.status ?? "pending";

    return {
      id: turn.id,
      speakerLabel: turn.speakerLabel ?? "Speaker",
      sourceLanguageLabel: (turn.sourceLanguage ?? "auto").toUpperCase(),
      sourceStatusLabelKey:
        turn.status === "final" ? "finalTurnsOnly" : "streamingPartialTranslation",
      sourceText: turn.text,
      translationVariant: {
        languageLabel: (translationVariant?.language ?? "en").toUpperCase(),
        status: variantStatus,
        statusLabelKey: mapVariantStatusLabelKey(variantStatus),
        text: translationVariant?.text ?? "",
        helperTextKey:
          variantStatus === "pending"
            ? "translationVariantPendingHelper"
            : binding.finalTranslation.ready || binding.partialTranslation.ready
              ? "translationProviderEnabledHelper"
              : "translationUnavailableHelper",
        ready: variantStatus === "final" || variantStatus === "partial",
      },
    };
  });
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
    turnGroups: buildTurnGroups(binding),
  };
}
