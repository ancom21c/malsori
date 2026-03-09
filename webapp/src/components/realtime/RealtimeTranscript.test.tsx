import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RealtimeTranscript from "./RealtimeTranscript";

vi.mock("../../i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
  }),
}));

vi.mock("../../hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: () => false,
  default: () => false,
}));

describe("RealtimeTranscript", () => {
  const scrollIntoViewMock = vi.fn();

  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
  });

  it("keeps polite live announcements when follow-live is disabled during an active session", () => {
    render(
      <RealtimeTranscript
        segments={[
          {
            id: "segment-1",
            text: "hello world",
            startMs: 0,
            endMs: 1200,
          },
        ]}
        partialText={null}
        noteMode={false}
        onNoteModeChange={() => undefined}
        followLive={false}
        onFollowLiveChange={() => undefined}
        noteModeText=""
        sessionState="recording"
      />
    );

    expect(
      screen.getByRole("log", { name: "realTimeTranscriptLog" }).getAttribute("aria-live")
    ).toBe("polite");
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("disables live announcements in note mode", () => {
    render(
      <RealtimeTranscript
        segments={[]}
        partialText="partial"
        noteMode
        onNoteModeChange={() => undefined}
        followLive
        onFollowLiveChange={() => undefined}
        noteModeText="notes"
        sessionState="recording"
      />
    );

    expect(screen.queryByRole("log", { name: "realTimeTranscriptLog" })).toBeNull();
    expect(screen.getByLabelText("noteModeTextAreaLabel")).toBeTruthy();
  });

  it("scrolls when follow-live is enabled and new content is present", () => {
    render(
      <RealtimeTranscript
        segments={[]}
        partialText="partial"
        noteMode={false}
        onNoteModeChange={() => undefined}
        followLive
        onFollowLiveChange={() => undefined}
        noteModeText=""
        sessionState="recording"
      />
    );

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("log", { name: "realTimeTranscriptLog" }).getAttribute("aria-live")
    ).toBe("polite");
  });
});
