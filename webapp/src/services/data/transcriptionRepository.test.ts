import { beforeEach, describe, expect, it, vi } from "vitest";
import { appDb } from "../../data/app-db";
import {
  appendAudioChunk,
    appendVideoChunk,
    createLocalTranscription,
    deleteAudioChunksByRole,
    deleteTranscription,
    listAudioChunks,
    listVideoChunks,
    replaceDownloadStatusIfCurrent,
    replaceSegments,
    updateSegmentCorrection,
    updateLocalTranscription,
  updateSegmentSpeakerLabel,
  updateSingleSegmentSpeakerLabel,
} from "./transcriptionRepository";
import {
  createSummaryPartition,
  createSummaryRun,
  saveSummaryPresetSelection,
  upsertPublishedSummary,
} from "./summaryRepository";
import {
  buildTurnTranslationId,
  upsertTurnTranslation,
} from "./translationRepository";

const SAMPLE_PCM_A = new Int16Array([0, 128, -128, 32767, -32768]).buffer;
const SAMPLE_PCM_B = new Int16Array([42, -42]).buffer;
const SAMPLE_VIDEO_A = new Uint8Array([1, 2, 3, 4]).buffer;
const SAMPLE_VIDEO_B = new Uint8Array([5, 6, 7, 8]).buffer;

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("transcriptionRepository", () => {
  it("creates and updates local transcription records", async () => {
    const record = await createLocalTranscription({
      title: "테스트",
      kind: "realtime",
      metadata: {
        sttTransport: "streaming",
        captureInput: "microphone",
        configPresetId: "preset-1",
        configPresetName: "테스트 프리셋",
        modelName: "sommers",
        backendEndpointId: "server-default",
        backendEndpointSource: "server-default",
        backendEndpointName: "서버 기본",
        realtimeSimulationEnabled: true,
      },
    });
    expect(record.status).toBe("pending");
    expect(record.sttTransport).toBe("streaming");
    expect(record.captureInput).toBe("microphone");
    expect(record.modelName).toBe("sommers");
    expect(record.realtimeSimulationEnabled).toBe(true);
    expect(record.searchTitle).toBe("테스트");

    await updateLocalTranscription(record.id, {
      status: "completed",
      transcriptText: "hello",
    });

    const stored = await appDb.transcriptions.get(record.id);
    expect(stored).toBeTruthy();
    expect(stored?.status).toBe("completed");
    expect(stored?.transcriptText).toBe("hello");
    expect(stored?.configPresetName).toBe("테스트 프리셋");
    expect(stored?.searchTranscript).toBe("hello");

    const searchIndex = await appDb.searchIndexes.get(record.id);
    expect(searchIndex).toBeTruthy();
    expect(searchIndex?.normalizedTranscript).toBe("hello");
    expect(searchIndex?.tokenSet).toContain("hello");
  });

  it("replaces download status only when the current lifecycle state still matches", async () => {
    const record = await createLocalTranscription({
      title: "download-state-guard",
      kind: "file",
    });
    await updateLocalTranscription(record.id, {
      isCloudSynced: true,
      downloadStatus: "downloading",
    });

    await expect(replaceDownloadStatusIfCurrent(record.id, "downloading", "not_downloaded")).resolves.toBe(true);
    let stored = await appDb.transcriptions.get(record.id);
    expect(stored?.downloadStatus).toBe("not_downloaded");

    await updateLocalTranscription(record.id, { downloadStatus: "downloaded" });
    await expect(replaceDownloadStatusIfCurrent(record.id, "downloading", "not_downloaded")).resolves.toBe(false);
    stored = await appDb.transcriptions.get(record.id);
    expect(stored?.downloadStatus).toBe("downloaded");
  });

  it("rolls back transcription creation when search index persistence fails", async () => {
    const deleteSpy = vi
      .spyOn(appDb.searchIndexes, "delete")
      .mockRejectedValueOnce(new Error("search index failed"));

    await expect(
      createLocalTranscription({
        title: "rollback guard",
        kind: "realtime",
      })
    ).rejects.toThrow("search index failed");

    await expect(appDb.transcriptions.count()).resolves.toBe(0);
    await expect(appDb.searchIndexes.count()).resolves.toBe(0);

    deleteSpy.mockRestore();
  });

  it("stores PCM audio chunks in order", async () => {
    const record = await createLocalTranscription({
      title: "audio",
      kind: "realtime",
    });

    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 1,
      data: SAMPLE_PCM_B,
    });
    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_PCM_A,
    });

    const chunks = await listAudioChunks(record.id);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1]);
    expect(Array.from(new Int16Array(chunks[0].data))).toEqual(Array.from(new Int16Array(SAMPLE_PCM_A)));
  });

  it("separates capture chunks from source-file chunks", async () => {
    const record = await createLocalTranscription({
      title: "source",
      kind: "file",
    });

    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_PCM_A,
      mimeType: "audio/pcm;rate=16000",
      role: "capture",
    });
    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_PCM_B,
      mimeType: "audio/mpeg",
      role: "source_file",
    });
    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 1,
      data: SAMPLE_PCM_A,
      mimeType: "audio/mpeg",
      role: "source_file",
    });

    const captureChunks = await listAudioChunks(record.id, { role: "capture" });
    const sourceChunks = await listAudioChunks(record.id, { role: "source_file" });

    expect(captureChunks).toHaveLength(1);
    expect(captureChunks[0].role).toBe("capture");
    expect(sourceChunks).toHaveLength(2);
    expect(sourceChunks.every((chunk) => chunk.role === "source_file")).toBe(true);
  });

  it("treats legacy chunks without role as capture chunks", async () => {
    const record = await createLocalTranscription({
      title: "legacy-capture",
      kind: "realtime",
    });

    await appDb.audioChunks.put({
      id: `${record.id}-legacy-0`,
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_PCM_A,
      mimeType: "audio/pcm;rate=16000",
      createdAt: new Date().toISOString(),
    });
    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 1,
      data: SAMPLE_PCM_B,
      mimeType: "audio/pcm;rate=16000",
      role: "capture",
    });

    const captureChunks = await listAudioChunks(record.id, { role: "capture" });
    const sourceChunks = await listAudioChunks(record.id, { role: "source_file" });

    expect(captureChunks).toHaveLength(2);
    expect(sourceChunks).toHaveLength(0);
  });

  it("deletes source chunks without removing capture chunks", async () => {
    const record = await createLocalTranscription({
      title: "cleanup-source",
      kind: "file",
    });

    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_PCM_A,
      role: "capture",
    });
    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_PCM_B,
      role: "source_file",
    });

    await deleteAudioChunksByRole(record.id, "source_file");

    const captureChunks = await listAudioChunks(record.id, { role: "capture" });
    const sourceChunks = await listAudioChunks(record.id, { role: "source_file" });
    expect(captureChunks).toHaveLength(1);
    expect(sourceChunks).toHaveLength(0);
  });

  it("stores video chunks in order", async () => {
    const record = await createLocalTranscription({
      title: "video",
      kind: "realtime",
    });

    await appendVideoChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_VIDEO_A,
      mimeType: "video/webm",
    });
    await appendVideoChunk({
      transcriptionId: record.id,
      chunkIndex: 1,
      data: SAMPLE_VIDEO_B,
    });

    const chunks = await listVideoChunks(record.id);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1]);
    expect(chunks[0].mimeType).toBe("video/webm");
    expect(Array.from(new Uint8Array(chunks[1].data))).toEqual(Array.from(new Uint8Array(SAMPLE_VIDEO_B)));
  });

  it("preserves segment corrections across segment replacements when enabled", async () => {
    const record = await createLocalTranscription({
      title: "교정 보존",
      kind: "file",
    });

    await replaceSegments(record.id, [
      {
        text: "hello world",
        startMs: 1000,
        endMs: 2000,
        correctedText: "hello corrected",
        isFinal: true,
      },
    ]);

    await replaceSegments(
      record.id,
      [
        {
          text: "hello   world",
          startMs: 1000,
          endMs: 2000,
          isFinal: true,
        },
      ],
      { preserveCorrections: true }
    );

    const nextSegments = await appDb.segments.where("transcriptionId").equals(record.id).toArray();
    expect(nextSegments).toHaveLength(1);
    expect(nextSegments[0].correctedText).toBe("hello corrected");
  });

  it("removes persisted turn translations before replacing segment ids", async () => {
    const record = await createLocalTranscription({
      title: "translation relink guard",
      kind: "realtime",
    });

    await replaceSegments(record.id, [
      {
        text: "첫 번째 발화",
        startMs: 0,
        endMs: 1000,
        isFinal: true,
      },
    ]);
    await upsertTurnTranslation({
      id: buildTurnTranslationId(record.id, `${record.id}-segment-0`, "en"),
      sessionId: record.id,
      turnId: `${record.id}-segment-0`,
      sourceRevision: "rev-1",
      sourceText: "첫 번째 발화",
      targetLanguage: "en",
      text: "First utterance.",
      status: "ready",
      requestedAt: "2026-03-12T00:00:00.000Z",
      completedAt: "2026-03-12T00:00:01.000Z",
    });

    await replaceSegments(record.id, [
      {
        text: "완전히 다른 새 발화",
        startMs: 0,
        endMs: 900,
        isFinal: true,
      },
    ]);

    await expect(
      appDb.turnTranslations.where("sessionId").equals(record.id).toArray()
    ).resolves.toEqual([]);
  });

  it("removes affected turn translations when a segment source turn is edited", async () => {
    const record = await createLocalTranscription({
      title: "translation correction guard",
      kind: "realtime",
    });

    await replaceSegments(record.id, [
      {
        text: "원문 하나",
        startMs: 0,
        endMs: 900,
        isFinal: true,
        spk: "1",
        speaker_label: "Speaker 1",
      },
      {
        text: "원문 둘",
        startMs: 1000,
        endMs: 1800,
        isFinal: true,
        spk: "2",
        speaker_label: "Speaker 2",
      },
    ]);
    await upsertTurnTranslation({
      id: buildTurnTranslationId(record.id, `${record.id}-segment-0`, "en"),
      sessionId: record.id,
      turnId: `${record.id}-segment-0`,
      sourceRevision: "rev-a",
      sourceText: "원문 하나",
      targetLanguage: "en",
      text: "First source.",
      status: "ready",
      requestedAt: "2026-03-12T00:01:00.000Z",
      completedAt: "2026-03-12T00:01:01.000Z",
    });
    await upsertTurnTranslation({
      id: buildTurnTranslationId(record.id, `${record.id}-segment-1`, "en"),
      sessionId: record.id,
      turnId: `${record.id}-segment-1`,
      sourceRevision: "rev-b",
      sourceText: "원문 둘",
      targetLanguage: "en",
      text: "Second source.",
      status: "ready",
      requestedAt: "2026-03-12T00:02:00.000Z",
      completedAt: "2026-03-12T00:02:01.000Z",
    });

    await updateSegmentCorrection(`${record.id}-segment-0`, "수정된 원문 하나");

    let remainingTranslations = await appDb.turnTranslations
      .where("sessionId")
      .equals(record.id)
      .toArray();
    expect(remainingTranslations.map((translation) => translation.turnId)).toEqual([
      `${record.id}-segment-1`,
    ]);

    await updateSegmentSpeakerLabel(record.id, "2", "Moderator");

    remainingTranslations = await appDb.turnTranslations
      .where("sessionId")
      .equals(record.id)
      .toArray();
    expect(remainingTranslations).toEqual([]);
  });

  it("does not preserve segment corrections when preserve flag is disabled", async () => {
    const record = await createLocalTranscription({
      title: "교정 미보존",
      kind: "file",
    });

    await replaceSegments(record.id, [
      {
        text: "sample line",
        startMs: 0,
        endMs: 500,
        correctedText: "sample corrected",
        isFinal: true,
      },
    ]);

    await replaceSegments(record.id, [
      {
        text: "sample line",
        startMs: 0,
        endMs: 500,
        isFinal: true,
      },
    ]);

    const nextSegments = await appDb.segments.where("transcriptionId").equals(record.id).toArray();
    expect(nextSegments).toHaveLength(1);
    expect(nextSegments[0].correctedText).toBeUndefined();
  });

  it("deletes linked segments and audio when removing transcription", async () => {
    const record = await createLocalTranscription({
      title: "삭제 대상",
      kind: "realtime",
    });

    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_PCM_A,
    });

    await replaceSegments(record.id, [
      {
        text: "segment",
        startMs: 0,
        endMs: 1000,
        isFinal: true,
      },
    ]);
    await appendVideoChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_VIDEO_A,
      mimeType: "video/webm",
    });
    await createSummaryPartition({
      id: "partition-1",
      sessionId: record.id,
      startTurnId: "turn-1",
      endTurnId: "turn-1",
      turnCount: 1,
      startedAt: "2026-03-10T00:00:00.000Z",
      endedAt: "2026-03-10T00:00:01.000Z",
      status: "finalized",
      reason: "manual",
      sourceRevision: record.updatedAt,
    });
    const run = await createSummaryRun({
      id: "run-1",
      sessionId: record.id,
      mode: "full",
      scope: "session",
      partitionIds: ["partition-1"],
      sourceRevision: record.updatedAt,
      requestedAt: "2026-03-10T00:00:02.000Z",
      completedAt: "2026-03-10T00:00:03.000Z",
      status: "ready",
      blocks: [],
    });
    await upsertPublishedSummary({
      sessionId: record.id,
      mode: "full",
      runId: run.id,
      title: "Summary",
      content: "Persisted summary",
      sourceRevision: record.updatedAt,
      partitionIds: ["partition-1"],
    });
    await saveSummaryPresetSelection({
      sessionId: record.id,
      selectedPresetId: "meeting",
      selectedPresetVersion: "2026-03-11",
      selectionSource: "manual",
      applyScope: "regenerate_all",
      lockedByUser: true,
    });
    await upsertTurnTranslation({
      id: buildTurnTranslationId(record.id, "turn-1", "en"),
      sessionId: record.id,
      turnId: "turn-1",
      sourceRevision: record.updatedAt,
      sourceText: "원문",
      targetLanguage: "en",
      text: "translation",
      status: "ready",
      requestedAt: "2026-03-10T00:00:04.000Z",
      completedAt: "2026-03-10T00:00:05.000Z",
    });

    await deleteTranscription(record.id);

    const stored = await appDb.transcriptions.get(record.id);
    expect(stored).toBeUndefined();
    const remainingSegments = await appDb.segments.where("transcriptionId").equals(record.id).count();
    expect(remainingSegments).toBe(0);
    const remainingChunks = await appDb.audioChunks.where("transcriptionId").equals(record.id).count();
    expect(remainingChunks).toBe(0);
    const remainingVideoChunks = await appDb.videoChunks
      .where("transcriptionId")
      .equals(record.id)
      .count();
    expect(remainingVideoChunks).toBe(0);
    const remainingSummaryPartitions = await appDb.summaryPartitions
      .where("sessionId")
      .equals(record.id)
      .count();
    expect(remainingSummaryPartitions).toBe(0);
    const remainingSummaryRuns = await appDb.summaryRuns
      .where("sessionId")
      .equals(record.id)
      .count();
    expect(remainingSummaryRuns).toBe(0);
    const remainingPublishedSummaries = await appDb.publishedSummaries
      .where("sessionId")
      .equals(record.id)
      .count();
    expect(remainingPublishedSummaries).toBe(0);
    const remainingPresetSelections = await appDb.summaryPresetSelections.count();
    expect(remainingPresetSelections).toBe(0);
    const remainingTurnTranslations = await appDb.turnTranslations
      .where("sessionId")
      .equals(record.id)
      .count();
    expect(remainingTurnTranslations).toBe(0);
  });

  it("marks persisted summary partitions and published summaries stale after segment replacement", async () => {
    const record = await createLocalTranscription({
      title: "summary stale",
      kind: "file",
    });

    await createSummaryPartition({
      id: "partition-1",
      sessionId: record.id,
      startTurnId: "turn-1",
      endTurnId: "turn-1",
      turnCount: 1,
      startedAt: "2026-03-10T00:00:00.000Z",
      endedAt: "2026-03-10T00:00:01.000Z",
      status: "finalized",
      reason: "manual",
      sourceRevision: record.updatedAt,
    });
    await upsertPublishedSummary({
      sessionId: record.id,
      mode: "realtime",
      runId: "run-1",
      title: "Summary",
      content: "Original summary",
      sourceRevision: record.updatedAt,
      partitionIds: ["partition-1"],
    });

    await replaceSegments(record.id, [
      {
        text: "updated segment",
        startMs: 0,
        endMs: 1000,
        isFinal: true,
      },
    ]);

    const partition = await appDb.summaryPartitions.get("partition-1");
    const summary = await appDb.publishedSummaries.get(`${record.id}-realtime`);

    expect(partition?.status).toBe("stale");
    expect(partition?.sourceRevision).not.toBe(record.updatedAt);
    expect(summary?.freshness).toBe("stale");
    expect(summary?.stalePartitionIds).toEqual(["partition-1"]);
  });

  it("keeps summary state unchanged when speaker relabel matches no segments", async () => {
    const record = await createLocalTranscription({
      title: "no speaker relabel drift",
      kind: "file",
    });

    await replaceSegments(record.id, [
      {
        text: "speaker one",
        startMs: 0,
        endMs: 800,
        isFinal: true,
        spk: "1",
        speaker_label: "Speaker 1",
      },
    ]);
    await createSummaryPartition({
      id: "partition-keep-fresh",
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
      runId: "run-keep-fresh",
      title: "Summary",
      content: "Should stay fresh",
      sourceRevision: record.updatedAt,
      partitionIds: ["partition-keep-fresh"],
    });

    await updateSegmentSpeakerLabel(record.id, "missing-speaker", "Moderator");

    const partition = await appDb.summaryPartitions.get("partition-keep-fresh");
    const summary = await appDb.publishedSummaries.get(`${record.id}-full`);

    expect(partition?.status).toBe("finalized");
    expect(partition?.staleReason ?? null).toBeNull();
    expect(summary?.freshness).toBe("fresh");
    expect(summary?.stalePartitionIds).toEqual([]);
  });

  it("keeps translations and summary state unchanged when correction is a no-op", async () => {
    const record = await createLocalTranscription({
      title: "no-op correction drift",
      kind: "file",
    });

    await replaceSegments(record.id, [
      {
        text: "speaker one",
        startMs: 0,
        endMs: 800,
        isFinal: true,
        correctedText: "speaker one corrected",
      },
    ]);
    await createSummaryPartition({
      id: "partition-noop-correction",
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
      runId: "run-noop-correction",
      title: "Summary",
      content: "Should stay fresh",
      sourceRevision: record.updatedAt,
      partitionIds: ["partition-noop-correction"],
    });
    await upsertTurnTranslation({
      id: buildTurnTranslationId(record.id, `${record.id}-segment-0`, "en"),
      sessionId: record.id,
      turnId: `${record.id}-segment-0`,
      sourceRevision: "rev-noop-correction",
      sourceText: "speaker one corrected",
      targetLanguage: "en",
      text: "Speaker one corrected.",
      status: "ready",
      requestedAt: "2026-03-12T00:03:00.000Z",
      completedAt: "2026-03-12T00:03:01.000Z",
    });

    await updateSegmentCorrection(`${record.id}-segment-0`, "speaker one corrected");

    const translations = await appDb.turnTranslations.where("sessionId").equals(record.id).toArray();
    const partition = await appDb.summaryPartitions.get("partition-noop-correction");
    const summary = await appDb.publishedSummaries.get(`${record.id}-full`);

    expect(translations).toHaveLength(1);
    expect(partition?.status).toBe("finalized");
    expect(summary?.freshness).toBe("fresh");
  });

  it("keeps translations and summary state unchanged when speaker relabel is a no-op", async () => {
    const record = await createLocalTranscription({
      title: "no-op speaker drift",
      kind: "file",
    });

    await replaceSegments(record.id, [
      {
        text: "speaker one",
        startMs: 0,
        endMs: 800,
        isFinal: true,
        spk: "1",
        speaker_label: "Speaker 1",
      },
    ]);
    await createSummaryPartition({
      id: "partition-noop-speaker",
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
      runId: "run-noop-speaker",
      title: "Summary",
      content: "Should stay fresh",
      sourceRevision: record.updatedAt,
      partitionIds: ["partition-noop-speaker"],
    });
    await upsertTurnTranslation({
      id: buildTurnTranslationId(record.id, `${record.id}-segment-0`, "en"),
      sessionId: record.id,
      turnId: `${record.id}-segment-0`,
      sourceRevision: "rev-noop-speaker",
      sourceText: "speaker one",
      targetLanguage: "en",
      text: "Speaker one.",
      status: "ready",
      requestedAt: "2026-03-12T00:04:00.000Z",
      completedAt: "2026-03-12T00:04:01.000Z",
    });

    await updateSegmentSpeakerLabel(record.id, "1", "Speaker 1");
    await updateSingleSegmentSpeakerLabel(`${record.id}-segment-0`, "Speaker 1", "1");

    const translations = await appDb.turnTranslations.where("sessionId").equals(record.id).toArray();
    const partition = await appDb.summaryPartitions.get("partition-noop-speaker");
    const summary = await appDb.publishedSummaries.get(`${record.id}-full`);

    expect(translations).toHaveLength(1);
    expect(partition?.status).toBe("finalized");
    expect(summary?.freshness).toBe("fresh");
  });
});
