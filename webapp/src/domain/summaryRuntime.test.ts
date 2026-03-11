import { describe, expect, it } from "vitest";
import {
  buildSummaryRunLifecycleInput,
  DEFAULT_SUMMARY_RUNTIME_POLICY,
  resolveSummaryRuntimePolicy,
  resolveSummaryStalePropagation,
} from "./summaryRuntime";

describe("summaryRuntime", () => {
  it("inherits timeout, retry, and fallback policy from feature bindings", () => {
    const policy = resolveSummaryRuntimePolicy({
      timeoutMs: 45000,
      retryPolicy: { maxAttempts: 4, backoffMs: 2000 },
      fallbackBackendProfileId: "summary-fallback",
    });

    expect(policy.timeoutMs).toBe(45000);
    expect(policy.retryPolicy).toEqual({ maxAttempts: 4, backoffMs: 2000 });
    expect(policy.fallbackBackendProfileId).toBe("summary-fallback");
  });

  it("falls back to the default runtime policy when binding metadata is missing", () => {
    expect(resolveSummaryRuntimePolicy()).toEqual(DEFAULT_SUMMARY_RUNTIME_POLICY);
  });

  it("targets affected partitions when a mutation includes a turn id", () => {
    const propagation = resolveSummaryStalePropagation({
      summaryState: {
        partitions: [
          {
            id: "partition-1",
            sessionId: "tx-1",
            startTurnId: "turn-1",
            endTurnId: "turn-2",
            turnIds: ["turn-1", "turn-2"],
            turnCount: 2,
            startedAt: "2026-03-11T00:00:00.000Z",
            endedAt: "2026-03-11T00:01:00.000Z",
            status: "finalized",
            reason: "manual",
            sourceRevision: "rev-1",
          },
          {
            id: "partition-2",
            sessionId: "tx-1",
            startTurnId: "turn-3",
            endTurnId: "turn-4",
            turnIds: ["turn-3", "turn-4"],
            turnCount: 2,
            startedAt: "2026-03-11T00:01:00.000Z",
            endedAt: "2026-03-11T00:02:00.000Z",
            status: "finalized",
            reason: "manual",
            sourceRevision: "rev-1",
          },
        ],
      },
      trigger: "segment_correction",
      turnId: "turn-1",
      staleAt: "2026-03-11T00:03:00.000Z",
    });

    expect(propagation.affectedPartitionIds).toEqual(["partition-1"]);
    expect(propagation.affectsSessionSummary).toBe(true);
    expect(propagation.trigger).toBe("segment_correction");
  });

  it("builds pending run lifecycle inputs for rerun-all and apply-from-now flows", () => {
    const lifecycle = buildSummaryRunLifecycleInput({
      sessionId: "tx-1",
      mode: "full",
      scope: "session",
      regenerationScope: "session",
      trigger: "preset_rerun_all",
      partitionIds: ["partition-1", "partition-2"],
      selection: {
        sessionId: "tx-1",
        selectedPresetId: "meeting",
        selectedPresetVersion: "2026-03-11",
        selectionSource: "manual",
        applyScope: "regenerate_all",
        lockedByUser: true,
        updatedAt: "2026-03-11T00:00:00.000Z",
        suggestion: null,
      },
      sourceRevision: "rev-2",
      requestedAt: "2026-03-11T00:03:00.000Z",
      binding: {
        timeoutMs: 30000,
        retryPolicy: { maxAttempts: 3, backoffMs: 1000 },
        fallbackBackendProfileId: "summary-fallback",
      },
    });

    expect(lifecycle.trigger).toBe("preset_rerun_all");
    expect(lifecycle.regenerationScope).toBe("session");
    expect(lifecycle.selectionSource).toBe("manual");
    expect(lifecycle.timeoutMs).toBe(30000);
    expect(lifecycle.retryPolicy.maxAttempts).toBe(3);
    expect(lifecycle.status).toBe("pending");
  });
});
