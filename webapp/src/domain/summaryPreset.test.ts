import { describe, expect, it } from "vitest";
import {
  createAutoSummaryPresetSelection,
  createManualSummaryPresetSelection,
  createSummaryPresetSuggestion,
  getProductDefaultSummaryPresetId,
  listSummaryPresets,
  resolveSummaryPresetSelection,
} from "./summaryPreset";

describe("summaryPreset", () => {
  it("provides the baseline preset library", () => {
    const presets = listSummaryPresets();
    expect(presets.map((preset) => preset.id)).toEqual([
      "meeting",
      "lecture",
      "interview",
      "casual",
    ]);
    expect(presets.every((preset) => preset.version === "2026-03-11")).toBe(true);
  });

  it("suggests the lecture preset from strong early lecture cues", () => {
    const suggestion = createSummaryPresetSuggestion(
      [
        { id: "turn-1", text: "Today we will start the lecture with chapter one." },
        { id: "turn-2", text: "Please note this example because it will be on the exam." },
      ],
      { now: "2026-03-11T00:00:00.000Z" }
    );

    expect(suggestion.suggestedPresetId).toBe("lecture");
    expect(suggestion.appliedPresetId).toBe("lecture");
    expect(suggestion.fallbackApplied).toBe(false);
    expect(suggestion.confidence).toBeGreaterThanOrEqual(0.6);
    expect(suggestion.evaluatedTurnStartTurnId).toBe("turn-1");
    expect(suggestion.evaluatedTurnEndTurnId).toBe("turn-2");
  });

  it("falls back to the product default when confidence is low", () => {
    const suggestion = createSummaryPresetSuggestion(
      [{ id: "turn-1", text: "Hello there." }],
      { now: "2026-03-11T00:00:00.000Z" }
    );

    expect(suggestion.fallbackApplied).toBe(true);
    expect(suggestion.appliedPresetId).toBe(getProductDefaultSummaryPresetId());

    const autoSelection = createAutoSummaryPresetSelection("tx-1", suggestion);
    expect(autoSelection.selectionSource).toBe("default");
    expect(autoSelection.selectedPresetId).toBe(getProductDefaultSummaryPresetId());
  });

  it("keeps manual overrides ahead of later auto suggestions", () => {
    const manualSelection = createManualSummaryPresetSelection(
      "tx-1",
      "interview",
      "regenerate_all",
      { updatedAt: "2026-03-11T00:00:00.000Z" }
    );

    const resolved = resolveSummaryPresetSelection({
      sessionId: "tx-1",
      turns: [{ id: "turn-1", text: "Agenda item one is the launch date." }],
      currentSelection: manualSelection,
      now: "2026-03-11T00:05:00.000Z",
    });

    expect(resolved.selectionSource).toBe("manual");
    expect(resolved.selectedPresetId).toBe("interview");
    expect(resolved.applyScope).toBe("regenerate_all");
  });
});
