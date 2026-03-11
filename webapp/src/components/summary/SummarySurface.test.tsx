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
});
