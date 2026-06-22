import { beforeEach, describe, expect, it } from "vitest";
import { appDb } from "../../data/app-db";
import { createLocalTranscription, replaceSegments } from "../data/transcriptionRepository";
import { createSummaryPartition, upsertPublishedSummary } from "../data/summaryRepository";
import { buildTurnTranslationId, upsertTurnTranslation } from "../data/translationRepository";
import { clearCloudSyncLocalState } from "./syncLocalState";

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("clearCloudSyncLocalState", () => {
  it("clears turn translations alongside synced session state", async () => {
    const record = await createLocalTranscription({
      title: "conflict replace",
      kind: "file",
    });

    await replaceSegments(record.id, [
      {
        text: "source turn",
        startMs: 0,
        endMs: 1000,
        isFinal: true,
      },
    ]);
    await createSummaryPartition({
      id: "partition-replace",
      sessionId: record.id,
      startTurnId: `${record.id}-segment-0`,
      endTurnId: `${record.id}-segment-0`,
      turnCount: 1,
      startedAt: "2026-03-10T00:00:00.000Z",
      endedAt: "2026-03-10T00:00:01.000Z",
      status: "finalized",
      reason: "manual",
      sourceRevision: record.updatedAt,
    });
    await upsertPublishedSummary({
      sessionId: record.id,
      mode: "full",
      runId: "run-replace",
      title: "Summary",
      content: "Persisted summary",
      sourceRevision: record.updatedAt,
      partitionIds: ["partition-replace"],
    });
    await upsertTurnTranslation({
      id: buildTurnTranslationId(record.id, `${record.id}-segment-0`, "en"),
      sessionId: record.id,
      turnId: `${record.id}-segment-0`,
      sourceRevision: record.updatedAt,
      sourceText: "source turn",
      targetLanguage: "en",
      text: "Translated turn",
      status: "ready",
      requestedAt: "2026-03-12T00:00:00.000Z",
      completedAt: "2026-03-12T00:00:01.000Z",
    });

    await clearCloudSyncLocalState();

    await expect(appDb.transcriptions.count()).resolves.toBe(0);
    await expect(appDb.summaryPartitions.count()).resolves.toBe(0);
    await expect(appDb.publishedSummaries.count()).resolves.toBe(0);
    await expect(appDb.turnTranslations.count()).resolves.toBe(0);
  });
});
