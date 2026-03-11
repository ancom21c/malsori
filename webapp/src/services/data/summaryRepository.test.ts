import { beforeEach, describe, expect, it } from "vitest";
import { appDb } from "../../data/app-db";
import {
  createSummaryPartition,
  createSummaryRun,
  deleteSessionSummaryState,
  markSessionSummaryStateStale,
  readSessionSummaryState,
  upsertPublishedSummary,
} from "./summaryRepository";

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("summaryRepository", () => {
  it("stores contiguous partitions, run history, and published summaries by session", async () => {
    const partition = await createSummaryPartition({
      id: "partition-1",
      sessionId: "tx-1",
      startTurnId: "turn-1",
      endTurnId: "turn-3",
      turnCount: 3,
      startedAt: "2026-03-11T00:00:00.000Z",
      endedAt: "2026-03-11T00:03:00.000Z",
      status: "finalized",
      reason: "speaker_shift",
      sourceRevision: "rev-1",
    });
    const run = await createSummaryRun({
      id: "run-1",
      sessionId: "tx-1",
      mode: "realtime",
      scope: "partition",
      partitionIds: [partition.id],
      presetId: "meeting",
      presetVersion: "2026-03-11",
      providerLabel: "OpenAI",
      model: "gpt-5-mini",
      sourceRevision: "rev-1",
      requestedAt: "2026-03-11T00:03:10.000Z",
      completedAt: "2026-03-11T00:03:12.000Z",
      status: "ready",
      blocks: [
        {
          id: "block-1",
          kind: "overview",
          title: "Overview",
          content: "Team aligned on the next launch window.",
          supportingSnippets: [
            {
              id: "snippet-1",
              turnId: "turn-2",
              speakerLabel: "Alice",
              startMs: 1000,
              endMs: 2000,
              text: "Let's target next Tuesday for the launch.",
            },
          ],
        },
      ],
    });

    await upsertPublishedSummary({
      sessionId: "tx-1",
      mode: "realtime",
      runId: run.id,
      title: "Live summary",
      content: "Team aligned on the next launch window.",
      requestedAt: run.requestedAt,
      updatedAt: "2026-03-11T00:03:12.000Z",
      providerLabel: "OpenAI",
      sourceRevision: "rev-1",
      partitionIds: [partition.id],
      blocks: run.blocks,
      supportingSnippets: run.blocks[0].supportingSnippets,
      freshness: "fresh",
    });

    const state = await readSessionSummaryState("tx-1");

    expect(state.partitions).toHaveLength(1);
    expect(state.partitions[0].reason).toBe("speaker_shift");
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0].partitionIds).toEqual(["partition-1"]);
    expect(state.publishedSummaries).toHaveLength(1);
    expect(state.publishedSummaries[0].supportingSnippets[0].speakerLabel).toBe("Alice");
  });

  it("marks persisted summaries stale and can delete them as a unit", async () => {
    await createSummaryPartition({
      id: "partition-1",
      sessionId: "tx-2",
      startTurnId: "turn-1",
      endTurnId: "turn-2",
      turnCount: 2,
      startedAt: "2026-03-11T01:00:00.000Z",
      endedAt: "2026-03-11T01:02:00.000Z",
      status: "finalized",
      reason: "silence_gap",
      sourceRevision: "rev-1",
    });
    await upsertPublishedSummary({
      sessionId: "tx-2",
      mode: "full",
      runId: "run-2",
      title: "Final summary",
      content: "Original summary",
      sourceRevision: "rev-1",
      partitionIds: ["partition-1"],
      freshness: "fresh",
    });

    await markSessionSummaryStateStale("tx-2", "rev-2");

    let state = await readSessionSummaryState("tx-2");
    expect(state.partitions[0].status).toBe("stale");
    expect(state.partitions[0].sourceRevision).toBe("rev-2");
    expect(state.publishedSummaries[0].freshness).toBe("stale");
    expect(state.publishedSummaries[0].stalePartitionIds).toEqual(["partition-1"]);

    await deleteSessionSummaryState("tx-2");

    state = await readSessionSummaryState("tx-2");
    expect(state.partitions).toHaveLength(0);
    expect(state.runs).toHaveLength(0);
    expect(state.publishedSummaries).toHaveLength(0);
  });
});
