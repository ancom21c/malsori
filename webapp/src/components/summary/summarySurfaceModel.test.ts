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
});
