import type {
  SummaryMode,
  SummaryPreset,
  SummaryPresetApplyScope,
  SummaryPresetSelection,
  SummaryPresetSelectionSource,
  SummaryPresetSuggestion,
} from "./session";

export interface SummaryPresetEvaluationTurn {
  id: string;
  text: string;
  speakerLabel?: string;
}

const PRODUCT_DEFAULT_PRESET_ID = "meeting";
const DEFAULT_PRESET_VERSION = "2026-03-11";
const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
const DEFAULT_MAX_EVALUATED_TURNS = 6;

const SUMMARY_PRESET_LIBRARY: SummaryPreset[] = [
  {
    id: "meeting",
    version: DEFAULT_PRESET_VERSION,
    label: "Meeting",
    description: "Highlights overview, decisions, owners, and open questions.",
    language: "auto",
    intendedContexts: ["meeting", "standup", "sync", "planning"],
    supportedModes: "both",
    outputSchema: [
      { id: "overview", label: "Overview", kind: "narrative", required: true },
      { id: "decisions", label: "Decisions", kind: "bullet_list", required: true },
      { id: "actionItems", label: "Action items", kind: "bullet_list", required: true },
      { id: "openQuestions", label: "Open questions", kind: "bullet_list", required: false },
    ],
    defaultModelHint: "balanced-reasoning",
    defaultSelectionWeight: 1.2,
  },
  {
    id: "lecture",
    version: DEFAULT_PRESET_VERSION,
    label: "Lecture",
    description: "Organizes topic flow, key claims, examples, and follow-up prompts.",
    language: "auto",
    intendedContexts: ["lecture", "class", "lesson", "training"],
    supportedModes: "both",
    outputSchema: [
      { id: "topicOutline", label: "Topic outline", kind: "bullet_list", required: true },
      { id: "keyClaims", label: "Key claims", kind: "bullet_list", required: true },
      { id: "examples", label: "Examples", kind: "bullet_list", required: false },
      { id: "followUps", label: "Follow-ups", kind: "bullet_list", required: false },
    ],
    defaultModelHint: "long-context",
    defaultSelectionWeight: 0.95,
  },
  {
    id: "interview",
    version: DEFAULT_PRESET_VERSION,
    label: "Interview",
    description: "Tracks themes, signals, quotable answers, and follow-up questions.",
    language: "auto",
    intendedContexts: ["interview", "screening", "q&a"],
    supportedModes: "both",
    outputSchema: [
      { id: "themes", label: "Themes", kind: "bullet_list", required: true },
      { id: "signals", label: "Signals", kind: "bullet_list", required: true },
      { id: "quotes", label: "Quotes", kind: "quote_list", required: false },
      { id: "followUps", label: "Follow-ups", kind: "bullet_list", required: false },
    ],
    defaultModelHint: "balanced-reasoning",
    defaultSelectionWeight: 0.9,
  },
  {
    id: "casual",
    version: DEFAULT_PRESET_VERSION,
    label: "Casual",
    description: "Captures gist, topics, notable moments, and lightweight next steps.",
    language: "auto",
    intendedContexts: ["chat", "social", "informal"],
    supportedModes: "both",
    outputSchema: [
      { id: "gist", label: "Gist", kind: "narrative", required: true },
      { id: "topics", label: "Topics", kind: "bullet_list", required: true },
      { id: "notableMoments", label: "Notable moments", kind: "bullet_list", required: false },
      { id: "nextSteps", label: "Next steps", kind: "bullet_list", required: false },
    ],
    defaultModelHint: "fast",
    defaultSelectionWeight: 0.8,
  },
];

const PRESET_KEYWORDS: Record<string, string[]> = {
  meeting: [
    "agenda",
    "decision",
    "action item",
    "owner",
    "deadline",
    "next step",
    "follow up",
    "roadmap",
    "meeting",
    "launch",
  ],
  lecture: [
    "today we'll",
    "today we will",
    "lecture",
    "lesson",
    "chapter",
    "student",
    "class",
    "professor",
    "slide",
    "homework",
    "exam",
  ],
  interview: [
    "tell me about",
    "walk me through",
    "why do you",
    "what would you",
    "interview",
    "candidate",
    "experience",
    "strength",
    "weakness",
    "role",
  ],
  casual: [
    "how are you",
    "weekend",
    "lunch",
    "coffee",
    "dinner",
    "weather",
    "movie",
    "game",
    "trip",
    "haha",
  ],
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createEmptyPresetScoreMap() {
  return SUMMARY_PRESET_LIBRARY.reduce<Record<string, number>>((acc, preset) => {
    acc[preset.id] = preset.defaultSelectionWeight;
    return acc;
  }, {});
}

function createEmptyReasonMap() {
  return SUMMARY_PRESET_LIBRARY.reduce<Record<string, Set<string>>>((acc, preset) => {
    acc[preset.id] = new Set<string>();
    return acc;
  }, {});
}

function getEvaluatedTurns(turns: SummaryPresetEvaluationTurn[]) {
  return turns
    .map((turn) => ({
      ...turn,
      text: normalizeText(turn.text),
    }))
    .filter((turn) => turn.text.length > 0)
    .slice(0, DEFAULT_MAX_EVALUATED_TURNS);
}

function inferPresetScores(turns: SummaryPresetEvaluationTurn[]) {
  const scores = createEmptyPresetScoreMap();
  const reasons = createEmptyReasonMap();
  const evaluatedTurns = getEvaluatedTurns(turns);

  for (const turn of evaluatedTurns) {
    for (const [presetId, keywords] of Object.entries(PRESET_KEYWORDS)) {
      const matchedKeywords = keywords.filter((keyword) => turn.text.includes(keyword));
      if (matchedKeywords.length === 0) {
        continue;
      }
      scores[presetId] += matchedKeywords.length;
      matchedKeywords.forEach((keyword) => reasons[presetId].add(keyword));
    }

    const questionMarks = (turn.text.match(/\?/g) ?? []).length;
    if (questionMarks > 0) {
      scores.interview += questionMarks * 0.6;
      reasons.interview.add("question-heavy opening");
    }
    if (turn.text.includes("let's") || turn.text.includes("we should")) {
      scores.meeting += 0.5;
      reasons.meeting.add("coordination language");
    }
    if (turn.text.includes("for example") || turn.text.includes("for instance")) {
      scores.lecture += 0.4;
      reasons.lecture.add("example-driven explanation");
    }
  }

  return { scores, reasons, evaluatedTurns };
}

function sortPresetScores(scores: Record<string, number>) {
  return Object.entries(scores).sort((left, right) => right[1] - left[1]);
}

export function listSummaryPresets() {
  return SUMMARY_PRESET_LIBRARY.map((preset) => ({ ...preset }));
}

export function getProductDefaultSummaryPresetId() {
  return PRODUCT_DEFAULT_PRESET_ID;
}

export function getSummaryPresetById(presetId: string) {
  return SUMMARY_PRESET_LIBRARY.find((preset) => preset.id === presetId) ?? null;
}

export function resolveSummaryPreset(presetId?: string | null) {
  return (
    getSummaryPresetById(presetId ?? "") ??
    getSummaryPresetById(PRODUCT_DEFAULT_PRESET_ID) ??
    SUMMARY_PRESET_LIBRARY[0]
  );
}

export function createSummaryPresetSuggestion(
  turns: SummaryPresetEvaluationTurn[],
  options?: {
    now?: string;
    fallbackPresetId?: string;
    minConfidence?: number;
    requestedMode?: SummaryMode;
  }
): SummaryPresetSuggestion {
  const fallbackPresetId = resolveSummaryPreset(
    options?.fallbackPresetId ?? PRODUCT_DEFAULT_PRESET_ID
  ).id;
  const { scores, reasons, evaluatedTurns } = inferPresetScores(turns);
  const rankedPresets = sortPresetScores(scores);
  const [topPresetId = fallbackPresetId, topScore = 0] = rankedPresets[0] ?? [];
  const [, secondScore = 0] = rankedPresets[1] ?? [];
  const confidence =
    evaluatedTurns.length === 0
      ? 0.25
      : clamp(
          0.35 + topScore * 0.08 + Math.max(0, topScore - secondScore) * 0.06,
          0.25,
          0.95
        );
  const minConfidence = options?.minConfidence ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const fallbackApplied = confidence < minConfidence;
  const supportedSuggestion = resolveSupportedPresetForMode(topPresetId, options?.requestedMode);
  const appliedPresetId = fallbackApplied
    ? resolveSupportedPresetForMode(fallbackPresetId, options?.requestedMode).id
    : supportedSuggestion.id;
  const suggestionReasons = Array.from(reasons[topPresetId] ?? []);
  const reason = fallbackApplied
    ? suggestionReasons.length > 0
      ? `Low-confidence match for ${topPresetId}; using ${appliedPresetId} as the safe default. Signals: ${suggestionReasons.join(", ")}.`
      : `No strong early-context signal was found; using ${appliedPresetId} as the safe default.`
    : suggestionReasons.length > 0
      ? `Matched ${topPresetId} signals: ${suggestionReasons.join(", ")}.`
      : `Selected ${topPresetId} from baseline context weighting.`;

  return {
    suggestedPresetId: supportedSuggestion.id,
    appliedPresetId,
    confidence: Number(confidence.toFixed(2)),
    reason,
    evaluatedTurnStartTurnId: evaluatedTurns[0]?.id ?? null,
    evaluatedTurnEndTurnId: evaluatedTurns[evaluatedTurns.length - 1]?.id ?? null,
    createdAt: options?.now ?? new Date().toISOString(),
    fallbackApplied,
  };
}

function resolveSupportedPresetForMode(presetId: string, requestedMode?: SummaryMode) {
  const preset = resolveSummaryPreset(presetId);
  if (!requestedMode || preset.supportedModes === "both" || preset.supportedModes === requestedMode) {
    return preset;
  }
  const compatiblePreset = SUMMARY_PRESET_LIBRARY.find(
    (candidate) =>
      candidate.id === PRODUCT_DEFAULT_PRESET_ID &&
      (candidate.supportedModes === "both" || candidate.supportedModes === requestedMode)
  );
  return compatiblePreset ?? resolveSummaryPreset();
}

function createSelection(
  params: {
    sessionId: string;
    presetId: string;
    selectionSource: SummaryPresetSelectionSource;
    applyScope: SummaryPresetApplyScope;
    lockedByUser: boolean;
    updatedAt: string;
    suggestion?: SummaryPresetSuggestion | null;
  }
): SummaryPresetSelection {
  const preset = resolveSummaryPreset(params.presetId);
  return {
    sessionId: params.sessionId,
    selectedPresetId: preset.id,
    selectedPresetVersion: preset.version,
    selectionSource: params.selectionSource,
    applyScope: params.applyScope,
    lockedByUser: params.lockedByUser,
    updatedAt: params.updatedAt,
    suggestion: params.suggestion ?? null,
  };
}

export function createAutoSummaryPresetSelection(
  sessionId: string,
  suggestion: SummaryPresetSuggestion,
  options?: { updatedAt?: string; applyScope?: SummaryPresetApplyScope }
) {
  return createSelection({
    sessionId,
    presetId: suggestion.appliedPresetId,
    selectionSource: suggestion.fallbackApplied ? "default" : "auto",
    applyScope: options?.applyScope ?? "from_now",
    lockedByUser: false,
    updatedAt: options?.updatedAt ?? suggestion.createdAt,
    suggestion,
  });
}

export function createManualSummaryPresetSelection(
  sessionId: string,
  presetId: string,
  applyScope: SummaryPresetApplyScope,
  options?: { updatedAt?: string; suggestion?: SummaryPresetSuggestion | null }
) {
  return createSelection({
    sessionId,
    presetId,
    selectionSource: "manual",
    applyScope,
    lockedByUser: true,
    updatedAt: options?.updatedAt ?? new Date().toISOString(),
    suggestion: options?.suggestion ?? null,
  });
}

export function resolveSummaryPresetSelection(params: {
  sessionId: string;
  turns: SummaryPresetEvaluationTurn[];
  requestedMode?: SummaryMode;
  currentSelection?: SummaryPresetSelection | null;
  now?: string;
}) {
  if (params.currentSelection?.selectionSource === "manual" && params.currentSelection.lockedByUser) {
    return params.currentSelection;
  }

  const suggestion = createSummaryPresetSuggestion(params.turns, {
    now: params.now,
    requestedMode: params.requestedMode,
  });
  return createAutoSummaryPresetSelection(params.sessionId, suggestion, {
    updatedAt: params.now ?? suggestion.createdAt,
  });
}
