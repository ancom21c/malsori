import { describe, expect, it } from "vitest";
import type { LocalTranscription } from "../data/app-db";
import {
  buildMediaStorageFaultPatch,
  buildTranscriptStorageFaultPatch,
  hasTranscriptStorageFault,
  isTranscriptOnlySession,
  resolveTrustedRemoteAudioUrl,
  shouldHideFromSavedHistory,
} from "./storageTrust";

function createRecord(
  patch: Partial<LocalTranscription> = {}
): LocalTranscription {
  return {
    id: "tx-1",
    title: "Realtime session",
    kind: "realtime",
    status: "processing",
    createdAt: "2026-06-29T00:00:00.000Z",
    updatedAt: "2026-06-29T00:00:00.000Z",
    ...patch,
  };
}

describe("storageTrust", () => {
  it("derives transcript-only semantics from media-only trust failure", () => {
    const record = createRecord({
      mediaStorageTrust: "broken",
      mediaStorageFaultReason: "audio_chunk_write_failed",
    });

    expect(isTranscriptOnlySession(record)).toBe(true);
    expect(hasTranscriptStorageFault(record)).toBe(false);
    expect(shouldHideFromSavedHistory(record)).toBe(false);
  });

  it("hides realtime storage-stop faults from normal saved history", () => {
    const record = createRecord({
      transcriptStorageTrust: "broken",
      transcriptStorageFaultReason: "segments_write_failed",
    });

    expect(hasTranscriptStorageFault(record)).toBe(true);
    expect(shouldHideFromSavedHistory(record)).toBe(true);
  });

  it("keeps trust faults monotonic once a session is already broken", () => {
    const existingMediaFault = createRecord({
      mediaStorageTrust: "broken",
      mediaStorageFaultReason: "audio_chunk_write_failed",
      mediaStorageFaultAt: "2026-06-29T00:00:10.000Z",
    });
    const existingTranscriptFault = createRecord({
      transcriptStorageTrust: "broken",
      transcriptStorageFaultReason: "segments_write_failed",
      transcriptStorageFaultAt: "2026-06-29T00:00:20.000Z",
    });

    expect(
      buildMediaStorageFaultPatch(existingMediaFault, "video_chunk_write_failed")
    ).toEqual({});
    expect(
      buildTranscriptStorageFaultPatch(
        existingTranscriptFault,
        "session_finalize_write_failed"
      )
    ).toEqual({});
  });

  it("drops remote audio references once transcript or media trust is broken", () => {
    const transcriptOnly = createRecord({
      remoteAudioUrl: "https://example.com/audio.webm",
      mediaStorageTrust: "broken",
      mediaStorageFaultReason: "audio_chunk_write_failed",
    });
    const storageStop = createRecord({
      remoteAudioUrl: "https://example.com/audio.webm",
      transcriptStorageTrust: "broken",
      transcriptStorageFaultReason: "segments_write_failed",
    });

    expect(resolveTrustedRemoteAudioUrl(transcriptOnly)).toBeUndefined();
    expect(resolveTrustedRemoteAudioUrl(storageStop)).toBeUndefined();
    expect(
      resolveTrustedRemoteAudioUrl(
        createRecord({
          remoteAudioUrl: "https://example.com/audio.webm",
        })
      )
    ).toBe("https://example.com/audio.webm");
  });
});
