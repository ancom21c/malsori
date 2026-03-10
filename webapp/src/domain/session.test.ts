import { describe, expect, it } from "vitest";
import type { LocalSegment, LocalTranscription } from "../data/app-db";
import {
  createDefaultSessionArtifacts,
  deriveSessionMode,
  deriveSessionState,
  mapLocalSegmentToSessionTurn,
  mapLocalTranscriptionToSessionRecord,
} from "./session";

function createLocalTranscription(
  patch: Partial<LocalTranscription> = {}
): LocalTranscription {
  return {
    id: "tx-1",
    title: "Session One",
    kind: "realtime",
    status: "processing",
    processingStage: "recording",
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:30.000Z",
    realtimeBufferedAudioMs: 1200,
    realtimeDroppedAudioMs: 240,
    realtimeReplayedAudioMs: 480,
    realtimeDroppedAudioRatio: 0.1,
    realtimeQualityState: "degraded",
    ...patch,
  };
}

function createSegment(patch: Partial<LocalSegment> = {}): LocalSegment {
  return {
    id: "seg-1",
    transcriptionId: "tx-1",
    spk: "1",
    speaker_label: "Speaker 1",
    language: "ko",
    startMs: 0,
    endMs: 1500,
    text: "원문입니다.",
    correctedText: "수정본입니다.",
    isPartial: false,
    isFinal: true,
    createdAt: "2026-03-10T00:00:00.000Z",
    words: [
      { text: "수정본", startMs: 0, endMs: 700, confidence: 0.8 },
      { text: "입니다", startMs: 700, endMs: 1500, confidence: 0.9 },
    ],
    ...patch,
  };
}

describe("shared session domain model", () => {
  it("derives capture modes from current local transcription kinds", () => {
    expect(deriveSessionMode(createLocalTranscription({ kind: "realtime" }))).toBe(
      "capture_realtime"
    );
    expect(deriveSessionMode(createLocalTranscription({ kind: "file" }))).toBe(
      "capture_file"
    );
  });

  it("maps local realtime processing into stable session states", () => {
    expect(
      deriveSessionState(
        createLocalTranscription({
          status: "processing",
          processingStage: "connecting",
          realtimeQualityState: "normal",
        })
      )
    ).toBe("preparing");

    expect(
      deriveSessionState(
        createLocalTranscription({
          status: "processing",
          processingStage: "recording",
          realtimeQualityState: "degraded",
        })
      )
    ).toBe("degraded");

    expect(
      deriveSessionState(
        createLocalTranscription({
          status: "completed",
          processingStage: "saving",
        })
      )
    ).toBe("ready");
  });

  it("maps local transcription records to canonical sessions with quality snapshots", () => {
    const session = mapLocalTranscriptionToSessionRecord(createLocalTranscription());
    expect(session.mode).toBe("capture_realtime");
    expect(session.state).toBe("degraded");
    expect(session.quality.bufferedAudioMs).toBe(1200);
    expect(session.quality.droppedAudioMs).toBe(240);
    expect(session.quality.replayedAudioMs).toBe(480);
    expect(session.quality.degraded).toBe(true);
  });

  it("maps local segments to canonical turns and preserves corrected text", () => {
    const turn = mapLocalSegmentToSessionTurn(createSegment());
    expect(turn.sessionId).toBe("tx-1");
    expect(turn.speakerId).toBe("1");
    expect(turn.speakerLabel).toBe("Speaker 1");
    expect(turn.sourceLanguage).toBe("ko");
    expect(turn.text).toBe("수정본입니다.");
    expect(turn.status).toBe("final");
    expect(turn.confidence).toBeCloseTo(0.85);
  });

  it("creates artifact slots without requiring backend providers", () => {
    const artifacts = createDefaultSessionArtifacts("tx-1");
    expect(artifacts).toHaveLength(4);
    expect(artifacts.every((artifact) => artifact.status === "not_requested")).toBe(true);
    expect(artifacts.every((artifact) => artifact.supportingSnippets.length === 0)).toBe(true);
    expect(artifacts.every((artifact) => artifact.requests.length === 0)).toBe(true);
  });
});
