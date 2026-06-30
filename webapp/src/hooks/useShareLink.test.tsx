import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LocalTranscription } from "../data/app-db";
import { parseSharePayload } from "../share/payload";
import { useShareLink } from "./useShareLink";

describe("useShareLink", () => {
  it("omits stale remote audio references for transcript-only sessions", async () => {
    const now = new Date().toISOString();
    const transcription: LocalTranscription = {
      id: "share-transcript-only",
      title: "Transcript only",
      kind: "realtime",
      status: "completed",
      createdAt: now,
      updatedAt: now,
      transcriptText: "hello world",
      remoteAudioUrl: "https://example.com/audio.webm",
      mediaStorageTrust: "broken",
      mediaStorageFaultReason: "audio_chunk_write_failed",
      mediaStorageFaultAt: now,
    };
    const enqueueSnackbar = vi.fn();
    const { result } = renderHook(() =>
      useShareLink({
        transcriptionId: transcription.id,
        transcription,
        segments: [],
        audioUrl: null,
        audioBlobRef: { current: null },
        shareAudioAvailable: false,
        t: (key: string) => key,
        enqueueSnackbar,
      })
    );

    await act(async () => {
      await result.current.handleGenerateShareLink();
    });

    await waitFor(() => {
      expect(result.current.shareLink).toBeTruthy();
    });

    const shareUrl = new URL(result.current.shareLink ?? "");
    const payload = shareUrl.hash.startsWith("#")
      ? new URLSearchParams(shareUrl.hash.slice(1)).get("payload")
      : null;
    expect(payload).toBeTruthy();

    const document = await parseSharePayload(payload ?? "");
    expect(document.audio).toBeUndefined();
    expect(document.remoteAudioUrl).toBeUndefined();
  });
});
