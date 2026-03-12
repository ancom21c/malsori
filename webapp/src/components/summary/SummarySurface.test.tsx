import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SummarySurface from "./SummarySurface";

vi.mock("../../i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
  }),
}));

describe("SummarySurface", () => {
  it("renders summary sections and lets users jump to supporting snippets", () => {
    const handleJump = vi.fn();

    render(
      <SummarySurface
        compactLayout={false}
        open
        onToggle={() => undefined}
        selectedMode="full"
        onModeChange={() => undefined}
        modeOptions={[
          { value: "off", labelKey: "off" },
          { value: "realtime", labelKey: "summaryLive" },
          { value: "full", labelKey: "summaryFull" },
        ]}
        view={{
          mode: "full",
          status: "ready",
          statusLabelKey: "artifactReady",
          helperTextKey: "summaryArtifactNotRequestedHelper",
          sections: [
            {
              id: "section-1",
              title: "Overview",
              content: "A concise summary.",
              supportingSnippets: [
                {
                  id: "snippet-1",
                  turnId: "turn-1",
                  speakerLabel: "Alice",
                  text: "Let's ship next week.",
                },
              ],
            },
          ],
          presetLabel: "Meeting",
          presetBadgeKey: "summaryAutoSelected",
          providerLabel: "Summary provider",
        }}
        onJumpToSnippet={handleJump}
      />
    );

    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("A concise summary.")).toBeTruthy();

    fireEvent.click(screen.getByText("Let's ship next week."));
    expect(handleJump).toHaveBeenCalledTimes(1);
  });

  it("renders preset scope and action controls for full summary mode", () => {
    const handlePresetChange = vi.fn();
    const handleApplyScopeChange = vi.fn();
    const handlePrimaryAction = vi.fn();
    const handleSecondaryAction = vi.fn();

    render(
      <SummarySurface
        compactLayout={false}
        open
        onToggle={() => undefined}
        selectedMode="full"
        onModeChange={() => undefined}
        modeOptions={[
          { value: "off", labelKey: "off" },
          { value: "realtime", labelKey: "summaryLive" },
          { value: "full", labelKey: "summaryFull" },
        ]}
        view={{
          mode: "full",
          status: "stale",
          statusLabelKey: "summaryStale",
          helperTextKey: "summaryStaleHelper",
          sections: [],
          presetLabel: "Meeting",
          presetBadgeKey: "summaryManualSelected",
          providerLabel: "Summary provider",
        }}
        controls={{
          presetOptions: [
            { value: "meeting", label: "Meeting" },
            { value: "lecture", label: "Lecture" },
          ],
          selectedPresetId: "meeting",
          onPresetChange: handlePresetChange,
          applyScope: "regenerate_all",
          onApplyScopeChange: handleApplyScopeChange,
          applyScopeHelperKey: "summaryPresetRegenerateAllHelper",
          primaryAction: {
            labelKey: "summaryRegenerate",
            onClick: handlePrimaryAction,
          },
          secondaryAction: {
            labelKey: "summaryOpenDetail",
            onClick: handleSecondaryAction,
          },
        }}
      />
    );

    expect(screen.getByText("summaryPreset")).toBeTruthy();
    expect(screen.getByText("summaryPresetRegenerateAllHelper")).toBeTruthy();

    fireEvent.click(screen.getByText("Lecture"));
    fireEvent.click(screen.getByText("summaryPresetApplyFromNow"));
    fireEvent.click(screen.getByText("summaryRegenerate"));
    fireEvent.click(screen.getByText("summaryOpenDetail"));

    expect(handlePresetChange).toHaveBeenCalledWith("lecture");
    expect(handleApplyScopeChange).toHaveBeenCalledWith("from_now");
    expect(handlePrimaryAction).toHaveBeenCalledTimes(1);
    expect(handleSecondaryAction).toHaveBeenCalledTimes(1);
  });
});
