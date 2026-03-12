import { describe, expect, it } from "vitest";
import { buildSummarySurfaceView } from "./summarySurfaceModel";

const readyBinding = {
  featureKey: "artifact.summary",
  resolution: null,
  statusLabelKey: "artifactReady",
  helperTextKey: "artifactBackendReadyHelper",
  tone: "success",
} as const;

const disabledBinding = {
  featureKey: "artifact.summary",
  resolution: null,
  statusLabelKey: "disabled",
  helperTextKey: "artifactNotRequestedHelper",
  tone: "default",
} as const;

describe("summarySurfaceModel", () => {
  it("returns a disabled view when binding is unavailable and no summary data exists", () => {
    const view = buildSummarySurfaceView({
      mode: "full",
      summaryState: null,
      binding: disabledBinding,
    });

    expect(view.status).toBe("disabled");
    expect(view.helperTextKey).toBe("summarySurfaceDisabledHelper");
  });

  it("marks the surface updating when a newer pending run exists beside published content", () => {
    const view = buildSummarySurfaceView({
      mode: "realtime",
      summaryState: {
        partitions: [],
        runs: [
          {
            id: "run-2",
            sessionId: "tx-1",
            mode: "realtime",
            scope: "partition",
            partitionIds: [],
            presetId: "meeting",
            presetVersion: "2026-03-11",
            selectionSource: "auto",
            sourceRevision: "rev-2",
            requestedAt: "2026-03-11T00:01:00.000Z",
            status: "pending",
            blocks: [],
          },
        ],
        publishedSummaries: [
          {
            id: "tx-1-realtime",
            sessionId: "tx-1",
            mode: "realtime",
            runId: "run-1",
            title: "Live summary",
            content: "Published summary content",
            updatedAt: "2026-03-11T00:00:40.000Z",
            sourceRevision: "rev-1",
            partitionIds: [],
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
          selectionSource: "auto",
          applyScope: "from_now",
          lockedByUser: false,
          updatedAt: "2026-03-11T00:00:30.000Z",
          suggestion: null,
        },
      },
      binding: readyBinding,
    });

    expect(view.status).toBe("updating");
    expect(view.statusLabelKey).toBe("summaryUpdating");
    expect(view.sections[0].content).toBe("Published summary content");
  });

  it("marks stale published summaries and preserves manual preset badges", () => {
    const view = buildSummarySurfaceView({
      mode: "full",
      summaryState: {
        partitions: [],
        runs: [],
        publishedSummaries: [
          {
            id: "tx-1-full",
            sessionId: "tx-1",
            mode: "full",
            runId: "run-1",
            title: "Final summary",
            content: "Needs refresh",
            updatedAt: "2026-03-11T00:00:40.000Z",
            sourceRevision: "rev-1",
            partitionIds: [],
            supportingSnippets: [],
            blocks: [],
            freshness: "stale",
            stalePartitionIds: [],
          },
        ],
        presetSelection: {
          sessionId: "tx-1",
          selectedPresetId: "lecture",
          selectedPresetVersion: "2026-03-11",
          selectionSource: "manual",
          applyScope: "regenerate_all",
          lockedByUser: true,
          updatedAt: "2026-03-11T00:00:30.000Z",
          suggestion: null,
        },
      },
      binding: readyBinding,
    });

    expect(view.status).toBe("stale");
    expect(view.presetBadgeKey).toBe("summaryManualSelected");
    expect(view.helperTextKey).toBe("summaryStaleHelper");
  });

  it("preserves published content while surfacing the latest failed rerun", () => {
    const view = buildSummarySurfaceView({
      mode: "full",
      summaryState: {
        partitions: [],
        runs: [
          {
            id: "run-2",
            sessionId: "tx-1",
            mode: "full",
            scope: "session",
            partitionIds: [],
            presetId: "meeting",
            presetVersion: "2026-03-11",
            selectionSource: "manual",
            sourceRevision: "rev-2",
            requestedAt: "2026-03-11T00:01:00.000Z",
            completedAt: "2026-03-11T00:01:10.000Z",
            status: "failed",
            errorMessage: "provider timeout",
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
            content: "Published summary content",
            updatedAt: "2026-03-11T00:00:40.000Z",
            sourceRevision: "rev-1",
            partitionIds: [],
            supportingSnippets: [],
            blocks: [],
            freshness: "fresh",
            stalePartitionIds: [],
          },
        ],
        presetSelection: null,
      },
      binding: readyBinding,
    });

    expect(view.status).toBe("failed");
    expect(view.statusLabelKey).toBe("artifactFailed");
    expect(view.sections[0].content).toBe("Published summary content");
  });

  it("marks realtime draft partitions as pending before the first live run completes", () => {
    const view = buildSummarySurfaceView({
      mode: "realtime",
      summaryState: {
        partitions: [
          {
            id: "partition-draft",
            sessionId: "tx-1",
            startTurnId: "turn-1",
            endTurnId: "turn-3",
            turnIds: ["turn-1", "turn-2", "turn-3"],
            turnCount: 3,
            startedAt: "2026-03-12T00:00:00.000Z",
            endedAt: "2026-03-12T00:00:04.000Z",
            status: "draft",
            reason: "manual",
            sourceRevision: "rev-1",
          },
        ],
        runs: [],
        publishedSummaries: [],
        presetSelection: null,
      },
      binding: readyBinding,
    });

    expect(view.status).toBe("pending");
    expect(view.statusLabelKey).toBe("artifactPending");
    expect(view.helperTextKey).toBe("summaryArtifactPendingHelper");
  });
});
