import { describe, expect, it } from "vitest";
import type { LocalSegment, LocalTranscription } from "../data/app-db";
import {
  buildSessionWorkspaceView,
  filterLocalSegmentsBySessionQuery,
  formatSessionDurationLabel,
  formatSessionLanguageSummary,
  getArtifactStatusKey,
  getArtifactTitleKey,
  getSessionModeLabelKey,
} from "./sessionWorkspaceModel";

const baseTranscription: LocalTranscription = {
  id: "tx-1",
  title: "Session A",
  kind: "realtime",
  status: "completed",
  createdAt: "2026-03-10T00:00:00.000Z",
  updatedAt: "2026-03-10T00:10:00.000Z",
  transcriptText: "First line summary\nSecond line detail",
  durationMs: 125000,
};

const baseSegments: LocalSegment[] = [
  {
    id: "seg-1",
    transcriptionId: "tx-1",
    spk: "1",
    speaker_label: "Alice",
    language: "ko",
    startMs: 0,
    endMs: 1000,
    text: "안녕하세요",
    createdAt: "2026-03-10T00:00:01.000Z",
  },
  {
    id: "seg-2",
    transcriptionId: "tx-1",
    spk: "2",
    speaker_label: "Bob",
    language: "en",
    startMs: 1000,
    endMs: 2500,
    text: "Hello there",
    correctedText: "Hello there!",
    createdAt: "2026-03-10T00:00:02.000Z",
  },
];

describe("sessionWorkspaceModel", () => {
  it("builds workspace metadata and artifact slots from a local session", () => {
    const view = buildSessionWorkspaceView(baseTranscription, baseSegments);

    expect(view.record.mode).toBe("capture_realtime");
    expect(view.speakerCount).toBe(2);
    expect(view.languageCodes).toEqual(["ko", "en"]);
    expect(view.summaryPreview).toBe("First line summary");
    expect(view.artifacts).toHaveLength(4);
    expect(view.artifacts.every((artifact) => artifact.status === "not_requested")).toBe(true);
  });

  it("hydrates the summary artifact and preview from persisted summary state", () => {
    const view = buildSessionWorkspaceView(baseTranscription, baseSegments, {
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
          sourceRevision: baseTranscription.updatedAt,
        },
      ],
      runs: [
        {
          id: "run-1",
          sessionId: "tx-1",
          mode: "full",
          scope: "session",
          partitionIds: ["partition-1"],
          selectionSource: "manual",
          sourceRevision: baseTranscription.updatedAt,
          requestedAt: "2026-03-10T00:10:10.000Z",
          completedAt: "2026-03-10T00:10:12.000Z",
          status: "ready",
          blocks: [],
        },
      ],
      publishedSummaries: [
        {
          id: "tx-1-full",
          sessionId: "tx-1",
          mode: "full",
          runId: "run-1",
          title: "Final summary",
          content: "A concise summary from persisted storage.",
          updatedAt: "2026-03-10T00:10:12.000Z",
          sourceRevision: baseTranscription.updatedAt,
          partitionIds: ["partition-1"],
          supportingSnippets: [],
          blocks: [],
          freshness: "fresh",
          stalePartitionIds: [],
        },
      ],
      presetSelection: {
        sessionId: "tx-1",
        selectedPresetId: "meeting",
        selectedPresetVersion: "2026-03-11",
        selectionSource: "manual",
        applyScope: "regenerate_all",
        lockedByUser: true,
        updatedAt: "2026-03-10T00:10:10.000Z",
        suggestion: null,
      },
    });

    expect(view.summaryPreview).toBe("A concise summary from persisted storage.");
    expect(view.artifacts[0].status).toBe("ready");
    expect(view.artifacts[0].content).toBe("A concise summary from persisted storage.");
    expect(view.artifacts[0].summaryMode).toBe("full");
    expect(view.artifacts[0].summaryPresetId).toBe("meeting");
    expect(view.artifacts[0].presetSelectionSource).toBe("manual");
  });

  it("filters local segments by transcript, speaker, or language query", () => {
    expect(filterLocalSegmentsBySessionQuery(baseSegments, "alice")).toHaveLength(1);
    expect(filterLocalSegmentsBySessionQuery(baseSegments, "hello there!")).toHaveLength(1);
    expect(filterLocalSegmentsBySessionQuery(baseSegments, "en")).toHaveLength(1);
    expect(filterLocalSegmentsBySessionQuery(baseSegments, "")).toHaveLength(2);
  });

  it("formats presentation labels for mode, duration, language, and artifacts", () => {
    expect(getSessionModeLabelKey("capture_file")).toBe("fileTranscription");
    expect(getArtifactTitleKey("action_items")).toBe("actionItems");
    expect(getArtifactStatusKey("not_requested")).toBe("artifactNotRequested");
    expect(formatSessionDurationLabel(125000)).toBe("2m 5s");
    expect(formatSessionLanguageSummary(["ko", "en", "ja"])).toBe("KO +2");
  });
});
