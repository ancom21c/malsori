import { describe, expect, it } from "vitest";
import type { LocalSegment, LocalTranscription } from "../data/app-db";
import {
  createSessionArtifacts,
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

  it("bridges persisted summary runs into the summary artifact surface", () => {
    const artifacts = createSessionArtifacts(
      "tx-1",
      {
        partitions: [
          {
            id: "partition-1",
            sessionId: "tx-1",
            startTurnId: "turn-1",
            endTurnId: "turn-2",
            turnCount: 2,
            startedAt: "2026-03-10T00:00:00.000Z",
            endedAt: "2026-03-10T00:02:00.000Z",
            status: "finalized",
            reason: "speaker_shift",
            sourceRevision: "rev-1",
          },
        ],
        runs: [
          {
            id: "run-pending",
            sessionId: "tx-1",
            mode: "realtime",
            scope: "partition",
            partitionIds: ["partition-1"],
            sourceRevision: "rev-1",
            requestedAt: "2026-03-10T00:02:30.000Z",
            status: "pending",
            blocks: [],
          },
          {
            id: "run-ready",
            sessionId: "tx-1",
            mode: "full",
            scope: "session",
            partitionIds: ["partition-1"],
            presetId: "meeting",
            presetVersion: "v1",
            providerLabel: "OpenAI",
            model: "gpt-5-mini",
            sourceRevision: "rev-1",
            requestedAt: "2026-03-10T00:03:00.000Z",
            completedAt: "2026-03-10T00:03:03.000Z",
            status: "ready",
            blocks: [
              {
                id: "block-1",
                kind: "overview",
                title: "Overview",
                content: "The team agreed on the launch checklist.",
                supportingSnippets: [
                  {
                    id: "snippet-1",
                    turnId: "turn-1",
                    speakerLabel: "Speaker 1",
                    startMs: 0,
                    endMs: 1200,
                    text: "Let's confirm the launch checklist today.",
                  },
                ],
              },
            ],
          },
        ],
        publishedSummaries: [
          {
            id: "tx-1-full",
            sessionId: "tx-1",
            mode: "full",
            runId: "run-ready",
            title: "Final summary",
            content: "The team agreed on the launch checklist.",
            requestedAt: "2026-03-10T00:03:00.000Z",
            updatedAt: "2026-03-10T00:03:03.000Z",
            providerLabel: "OpenAI",
            sourceRevision: "rev-1",
            partitionIds: ["partition-1"],
            supportingSnippets: [
              {
                id: "snippet-1",
                turnId: "turn-1",
                speakerLabel: "Speaker 1",
                startMs: 0,
                endMs: 1200,
                text: "Let's confirm the launch checklist today.",
              },
            ],
            blocks: [
              {
                id: "block-1",
                kind: "overview",
                title: "Overview",
                content: "The team agreed on the launch checklist.",
                supportingSnippets: [],
              },
            ],
            freshness: "fresh",
            stalePartitionIds: [],
          },
        ],
      },
      "rev-1"
    );

    const summary = artifacts[0];
    expect(summary.type).toBe("summary");
    expect(summary.status).toBe("ready");
    expect(summary.summaryMode).toBe("full");
    expect(summary.freshness).toBe("fresh");
    expect(summary.content).toBe("The team agreed on the launch checklist.");
    expect(summary.requests).toHaveLength(2);
    expect(summary.requests[0].summaryMode).toBe("full");
    expect(summary.supportingSnippets[0].turnId).toBe("turn-1");
  });

  it("keeps the latest published summary visible while marking it stale against newer source", () => {
    const [summary] = createSessionArtifacts(
      "tx-1",
      {
        partitions: [
          {
            id: "partition-1",
            sessionId: "tx-1",
            startTurnId: "turn-1",
            endTurnId: "turn-2",
            turnCount: 2,
            startedAt: "2026-03-10T00:00:00.000Z",
            endedAt: "2026-03-10T00:02:00.000Z",
            status: "stale",
            reason: "manual",
            sourceRevision: "rev-2",
          },
        ],
        runs: [
          {
            id: "run-ready",
            sessionId: "tx-1",
            mode: "realtime",
            scope: "partition",
            partitionIds: ["partition-1"],
            sourceRevision: "rev-1",
            requestedAt: "2026-03-10T00:03:00.000Z",
            completedAt: "2026-03-10T00:03:03.000Z",
            status: "ready",
            blocks: [],
          },
        ],
        publishedSummaries: [
          {
            id: "tx-1-realtime",
            sessionId: "tx-1",
            mode: "realtime",
            runId: "run-ready",
            title: "Live summary",
            content: "Original summary remains visible.",
            updatedAt: "2026-03-10T00:03:03.000Z",
            sourceRevision: "rev-1",
            partitionIds: ["partition-1"],
            supportingSnippets: [],
            blocks: [],
            freshness: "fresh",
            stalePartitionIds: [],
          },
        ],
      },
      "rev-2"
    );

    expect(summary.status).toBe("ready");
    expect(summary.content).toBe("Original summary remains visible.");
    expect(summary.freshness).toBe("stale");
    expect(summary.stalePartitionIds).toEqual(["partition-1"]);
  });

  it("falls back to the latest ready run when a published summary snapshot is missing", () => {
    const [summary] = createSessionArtifacts(
      "tx-1",
      {
        partitions: [],
        runs: [
          {
            id: "run-ready",
            sessionId: "tx-1",
            mode: "full",
            scope: "session",
            partitionIds: [],
            providerLabel: "OpenAI",
            sourceRevision: "rev-1",
            requestedAt: "2026-03-10T00:03:00.000Z",
            completedAt: "2026-03-10T00:03:03.000Z",
            status: "ready",
            blocks: [
              {
                id: "block-1",
                kind: "overview",
                title: "Overview",
                content: "Fallback summary content",
                supportingSnippets: [],
              },
            ],
          },
        ],
        publishedSummaries: [],
      },
      "rev-1"
    );

    expect(summary.status).toBe("ready");
    expect(summary.content).toBe("Overview: Fallback summary content");
    expect(summary.summaryRunId).toBe("run-ready");
  });
});
