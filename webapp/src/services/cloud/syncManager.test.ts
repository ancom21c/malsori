import { beforeEach, describe, expect, it, vi } from "vitest";
import { appDb, type LocalSegment, type LocalTranscription } from "../../data/app-db";
import { createSummaryPartition, upsertPublishedSummary } from "../data/summaryRepository";
import { buildTurnTranslationId, upsertTurnTranslation } from "../data/translationRepository";
import { SyncManager } from "./syncManager";
import type { DriveFile, GoogleDriveService } from "./googleDriveService";

const FOLDER_MIME = "application/vnd.google-apps.folder";

function buildLocalRecord(
  id: string,
  patch?: Partial<LocalTranscription>
): LocalTranscription {
  const now = new Date().toISOString();
  return {
    id,
    title: `record-${id}`,
    kind: "file",
    status: "completed",
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

async function parseBlobJson(blob: unknown): Promise<Record<string, unknown>> {
  if (typeof blob === "string") {
    return JSON.parse(blob) as Record<string, unknown>;
  }
  try {
    const payload = await new Response(blob as BodyInit).text();
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    // Fall through to compatibility paths.
  }
  if (typeof (blob as { arrayBuffer?: unknown }).arrayBuffer === "function") {
    const payload = await (blob as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
    return JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
  }
  if (
    blob &&
    typeof blob === "object" &&
    typeof (blob as { slice?: unknown }).slice === "function" &&
    typeof FileReader !== "undefined"
  ) {
    const payload = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
      reader.readAsText(blob as Blob);
    });
    return JSON.parse(payload) as Record<string, unknown>;
  }
  throw new Error("Blob payload is not readable");
}

function createPushDriveServiceMock(recordId: string, options?: { uploadError?: Error }) {
  const rootFolder: DriveFile = { id: "root-folder", name: "Malsori Data", mimeType: FOLDER_MIME };
  const transcriptionsFolder: DriveFile = {
    id: "transcriptions-folder",
    name: "transcriptions",
    mimeType: FOLDER_MIME,
  };
  const recordFolder: DriveFile = {
    id: `folder-${recordId}`,
    name: recordId,
    mimeType: FOLDER_MIME,
  };

  const listFiles = vi.fn(async (query: string): Promise<DriveFile[]> => {
    if (query.includes("name = 'Malsori Data'")) {
      return [rootFolder];
    }
    if (query.includes("name = 'transcriptions'")) {
      return [transcriptionsFolder];
    }
    if (query.includes(`name = '${recordId}'`) && query.includes("'transcriptions-folder' in parents")) {
      return [recordFolder];
    }
    return [];
  });

  const createFolder = vi.fn(async (name: string): Promise<DriveFile> => ({
    id: `created-${name}`,
    name,
    mimeType: FOLDER_MIME,
  }));

  const downloadFile = vi.fn(async (): Promise<Blob> => new Blob([], { type: "application/json" }));

  const uploadFile = vi.fn(
    async (
      name: string,
      blob: Blob,
      parentId?: string,
      mimeType?: string
    ): Promise<DriveFile> => {
      void parentId;
      if (options?.uploadError) {
        throw options.uploadError;
      }
      return {
        id: `uploaded-${name}`,
        name,
        mimeType: mimeType ?? blob.type,
      };
    }
  );

  const service = {
    listFiles,
    createFolder,
    downloadFile,
    uploadFile,
  } as unknown as GoogleDriveService;

  return { service, listFiles, createFolder, downloadFile, uploadFile };
}

function createPullDriveServiceMock(
  cloudRecord: LocalTranscription,
  options?: {
    segments?: LocalSegment[];
    audioFile?: DriveFile & { payload?: Uint8Array };
    videoFile?: DriveFile & { payload?: Uint8Array };
  }
) {
  const rootFolder: DriveFile = { id: "root-folder", name: "Malsori Data", mimeType: FOLDER_MIME };
  const transcriptionsFolder: DriveFile = {
    id: "transcriptions-folder",
    name: "transcriptions",
    mimeType: FOLDER_MIME,
  };
  const cloudFolder: DriveFile = {
    id: "cloud-folder",
    name: cloudRecord.id,
    mimeType: FOLDER_MIME,
  };

  const listFiles = vi.fn(async (query: string): Promise<DriveFile[]> => {
    if (query.includes("name = 'Malsori Data'")) {
      return [rootFolder];
    }
    if (query.includes("name = 'transcriptions'")) {
      return [transcriptionsFolder];
    }
    if (
      query.includes("'transcriptions-folder' in parents") &&
      query.includes("mimeType = 'application/vnd.google-apps.folder'")
    ) {
      return [cloudFolder];
    }
    if (query.includes("name = 'metadata.json'") && query.includes("'cloud-folder' in parents")) {
      return [{ id: "meta-file", name: "metadata.json", mimeType: "application/json" }];
    }
    if (query.includes("name = 'segments.json'") && query.includes("'cloud-folder' in parents")) {
      if (options?.segments) {
        return [{ id: "segments-file", name: "segments.json", mimeType: "application/json" }];
      }
      return [];
    }
    if (query.includes("name = 'audio.wav' or name = 'audio.webm'") && query.includes("'cloud-folder' in parents")) {
      return options?.audioFile ? [options.audioFile] : [];
    }
    if (query.includes("name = 'video.webm' or name = 'video.mp4'") && query.includes("'cloud-folder' in parents")) {
      return options?.videoFile ? [options.videoFile] : [];
    }
    return [];
  });

  const createFolder = vi.fn(async (name: string): Promise<DriveFile> => ({
    id: `created-${name}`,
    name,
    mimeType: FOLDER_MIME,
  }));

  const downloadFile = vi.fn(async (fileId: string): Promise<Blob> => {
    if (fileId === "meta-file") {
      return {
        text: async () => JSON.stringify(cloudRecord),
        arrayBuffer: async () =>
          new TextEncoder().encode(JSON.stringify(cloudRecord)).buffer,
      } as unknown as Blob;
    }
    if (fileId === "segments-file") {
      const payload = JSON.stringify(options?.segments ?? []);
      return {
        text: async () => payload,
        arrayBuffer: async () => new TextEncoder().encode(payload).buffer,
      } as unknown as Blob;
    }
    if (fileId === options?.audioFile?.id) {
      const payload = options.audioFile.payload ?? new Uint8Array([1, 2, 3]);
      return {
        text: async () => "",
        arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
      } as unknown as Blob;
    }
    if (fileId === options?.videoFile?.id) {
      const payload = options.videoFile.payload ?? new Uint8Array([4, 5, 6]);
      return {
        text: async () => "",
        arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
      } as unknown as Blob;
    }
    return {
      text: async () => "",
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Blob;
  });

  const uploadFile = vi.fn(
    async (
      name: string,
      blob: Blob,
      parentId?: string,
      mimeType?: string
    ): Promise<DriveFile> => {
      void parentId;
      return {
        id: `uploaded-${name}`,
        name,
        mimeType: mimeType ?? blob.type,
      };
    }
  );

  const service = {
    listFiles,
    createFolder,
    downloadFile,
    uploadFile,
  } as unknown as GoogleDriveService;

  return { service, listFiles, createFolder, downloadFile, uploadFile };
}

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("SyncManager", () => {
  it("sanitizes retry/source-local fields before uploading metadata", async () => {
    const record = buildLocalRecord("tx-sync", {
      isCloudSynced: true,
      downloadStatus: "downloaded",
      syncRetryCount: 2,
      syncErrorMessage: "old error",
      sourceFileStorageState: "ready",
      sourceFileChunkCount: 3,
      sourceFileStoredBytes: 1_234,
    });
    await appDb.transcriptions.put(record);

    const { service, uploadFile } = createPushDriveServiceMock(record.id);
    const manager = new SyncManager(service);
    const summary = await manager.pushUpdates();

    expect(summary.failed).toBe(0);
    expect(summary.processed).toBe(1);
    const metadataCall = uploadFile.mock.calls.find((call) => call[0] === "metadata.json");
    expect(metadataCall).toBeTruthy();
    const metadataBlob = metadataCall?.[1] as Blob;
    const metadataPayload = await parseBlobJson(metadataBlob);
    expect(metadataPayload).not.toHaveProperty("syncRetryCount");
    expect(metadataPayload).not.toHaveProperty("nextSyncAttemptAt");
    expect(metadataPayload).not.toHaveProperty("syncErrorMessage");
    expect(metadataPayload).not.toHaveProperty("sourceFileStorageState");
    expect(metadataPayload).not.toHaveProperty("sourceFileChunkCount");
    expect(metadataPayload).not.toHaveProperty("sourceFileStoredBytes");
  });

  it("skips push for records whose next retry window has not opened", async () => {
    const record = buildLocalRecord("tx-skip", {
      isCloudSynced: true,
      downloadStatus: "downloaded",
      syncRetryCount: 1,
      nextSyncAttemptAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      syncErrorMessage: "temporary error",
    });
    await appDb.transcriptions.put(record);

    const { service, uploadFile } = createPushDriveServiceMock(record.id);
    const manager = new SyncManager(service);
    const summary = await manager.pushUpdates();

    expect(summary.processed).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(summary.failed).toBe(0);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("increments retry state with backoff when push upload fails", async () => {
    const record = buildLocalRecord("tx-fail", {
      isCloudSynced: true,
      downloadStatus: "downloaded",
      syncRetryCount: 1,
      syncErrorMessage: "old error",
    });
    await appDb.transcriptions.put(record);

    const { service } = createPushDriveServiceMock(record.id, {
      uploadError: new Error("upload failed"),
    });
    const manager = new SyncManager(service);
    const startTime = Date.now();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const summary = await manager.pushUpdates();
    warnSpy.mockRestore();

    expect(summary.processed).toBe(1);
    expect(summary.failed).toBe(1);
    const stored = await appDb.transcriptions.get(record.id);
    expect(stored?.syncRetryCount).toBe(2);
    expect(stored?.syncErrorMessage).toBe("upload failed");
    const nextAttempt = Date.parse(stored?.nextSyncAttemptAt ?? "");
    expect(Number.isFinite(nextAttempt)).toBe(true);
    expect(nextAttempt).toBeGreaterThan(startTime);
  });

  it("sanitizes retry/source-local fields when pulling cloud metadata", async () => {
    const cloudRecord = buildLocalRecord("cloud-1", {
      isCloudSynced: true,
      downloadStatus: "downloaded",
      syncRetryCount: 3,
      nextSyncAttemptAt: new Date(Date.now() + 60_000).toISOString(),
      syncErrorMessage: "should not propagate",
      sourceFileStorageState: "ready",
      sourceFileChunkCount: 9,
      sourceFileStoredBytes: 9_999,
    });
    const { service } = createPullDriveServiceMock(cloudRecord);
    const manager = new SyncManager(service);

    const summary = await manager.pullUpdates();
    expect(summary.processed).toBe(1);
    expect(summary.failed).toBe(0);
    const stored = await appDb.transcriptions.get(cloudRecord.id);
    expect(stored).toBeTruthy();
    expect(stored?.syncRetryCount).toBeUndefined();
    expect(stored?.nextSyncAttemptAt).toBeUndefined();
    expect(stored?.syncErrorMessage).toBeUndefined();
    expect(stored?.sourceFileStorageState).toBeUndefined();
    expect(stored?.sourceFileChunkCount).toBeUndefined();
    expect(stored?.sourceFileStoredBytes).toBeUndefined();
  });

  it("refreshes segments and search index when pulling a newer cloud record that is already downloaded", async () => {
    const recordId = "cloud-refresh";
    const localUpdatedAt = new Date(Date.now() - 60_000).toISOString();
    const cloudUpdatedAt = new Date(Date.now()).toISOString();

    const localRecord = buildLocalRecord(recordId, {
      isCloudSynced: true,
      downloadStatus: "downloaded",
      updatedAt: localUpdatedAt,
      transcriptText: "old transcript",
    });
    await appDb.transcriptions.put(localRecord);
    await appDb.segments.add({
      id: "seg-local",
      transcriptionId: recordId,
      startMs: 0,
      endMs: 1000,
      text: "old text",
      createdAt: localUpdatedAt,
    });
    await createSummaryPartition({
      id: "partition-cloud-refresh",
      sessionId: recordId,
      startTurnId: "seg-local",
      endTurnId: "seg-local",
      turnCount: 1,
      startedAt: localUpdatedAt,
      endedAt: localUpdatedAt,
      status: "finalized",
      reason: "manual",
      sourceRevision: localUpdatedAt,
    });
    await upsertPublishedSummary({
      sessionId: recordId,
      mode: "full",
      runId: "run-cloud-refresh",
      title: "Local summary",
      content: "Persisted",
      sourceRevision: localUpdatedAt,
      partitionIds: ["partition-cloud-refresh"],
    });
    await upsertTurnTranslation({
      id: buildTurnTranslationId(recordId, "seg-local", "en"),
      sessionId: recordId,
      turnId: "seg-local",
      sourceRevision: localUpdatedAt,
      sourceText: "old text",
      targetLanguage: "en",
      text: "old translation",
      status: "ready",
      requestedAt: localUpdatedAt,
      completedAt: localUpdatedAt,
    });

    const cloudSegments: LocalSegment[] = [
      {
        id: "seg-cloud",
        transcriptionId: recordId,
        startMs: 0,
        endMs: 1000,
        text: "new text",
        createdAt: cloudUpdatedAt,
      },
    ];
    const cloudRecord: LocalTranscription = {
      ...localRecord,
      title: "cloud-title",
      updatedAt: cloudUpdatedAt,
      transcriptText: "new transcript",
    };

    const { service, downloadFile } = createPullDriveServiceMock(cloudRecord, { segments: cloudSegments });
    const manager = new SyncManager(service);

    const summary = await manager.pullUpdates();
    expect(summary.failed).toBe(0);

    const stored = await appDb.transcriptions.get(recordId);
    expect(stored?.title).toBe("cloud-title");
    expect(stored?.transcriptText).toBe("new transcript");

    const segments = await appDb.segments.where("transcriptionId").equals(recordId).toArray();
    expect(segments).toHaveLength(1);
    expect(segments[0]?.id).toBe("seg-cloud");
    expect(downloadFile).toHaveBeenCalledWith("segments-file");

    const searchIndex = await appDb.searchIndexes.get(recordId);
    expect(searchIndex).toBeTruthy();
    expect(searchIndex?.normalizedTranscript).toContain("new");

    const translations = await appDb.turnTranslations.where("sessionId").equals(recordId).toArray();
    expect(translations).toHaveLength(0);
    const partition = await appDb.summaryPartitions.get("partition-cloud-refresh");
    expect(partition?.status).toBe("stale");
    expect(partition?.staleReason).toBe("partition_boundary_change");
    const publishedSummary = await appDb.publishedSummaries.get(`${recordId}-full`);
    expect(publishedSummary?.freshness).toBe("stale");
    expect(publishedSummary?.staleReason).toBe("partition_boundary_change");
  });

  it("clears dependent translations and stales summaries when downloading replacement segments", async () => {
    const recordId = "cloud-download";
    const localUpdatedAt = new Date(Date.now() - 60_000).toISOString();
    const cloudUpdatedAt = new Date(Date.now()).toISOString();

    await appDb.transcriptions.put(
      buildLocalRecord(recordId, {
        isCloudSynced: true,
        downloadStatus: "downloaded",
        updatedAt: cloudUpdatedAt,
      })
    );
    await appDb.segments.add({
      id: "seg-download-local",
      transcriptionId: recordId,
      startMs: 0,
      endMs: 1000,
      text: "local text",
      createdAt: localUpdatedAt,
    });
    await createSummaryPartition({
      id: "partition-cloud-download",
      sessionId: recordId,
      startTurnId: "seg-download-local",
      endTurnId: "seg-download-local",
      turnCount: 1,
      startedAt: localUpdatedAt,
      endedAt: localUpdatedAt,
      status: "finalized",
      reason: "manual",
      sourceRevision: localUpdatedAt,
    });
    await upsertPublishedSummary({
      sessionId: recordId,
      mode: "full",
      runId: "run-cloud-download",
      title: "Local summary",
      content: "Persisted",
      sourceRevision: localUpdatedAt,
      partitionIds: ["partition-cloud-download"],
    });
    await upsertTurnTranslation({
      id: buildTurnTranslationId(recordId, "seg-download-local", "en"),
      sessionId: recordId,
      turnId: "seg-download-local",
      sourceRevision: localUpdatedAt,
      sourceText: "local text",
      targetLanguage: "en",
      text: "local translation",
      status: "ready",
      requestedAt: localUpdatedAt,
      completedAt: localUpdatedAt,
    });

    const cloudRecord = buildLocalRecord(recordId, {
      isCloudSynced: true,
      updatedAt: cloudUpdatedAt,
    });
    const cloudSegments: LocalSegment[] = [
      {
        id: "seg-download-cloud",
        transcriptionId: recordId,
        startMs: 0,
        endMs: 1500,
        text: "cloud text",
        createdAt: cloudUpdatedAt,
      },
    ];
    const { service } = createPullDriveServiceMock(cloudRecord, { segments: cloudSegments });
    const manager = new SyncManager(service);

    await manager.downloadFullRecord(recordId);

    const segments = await appDb.segments.where("transcriptionId").equals(recordId).toArray();
    expect(segments).toHaveLength(1);
    expect(segments[0]?.id).toBe("seg-download-cloud");

    const translations = await appDb.turnTranslations.where("sessionId").equals(recordId).toArray();
    expect(translations).toHaveLength(0);
    const partition = await appDb.summaryPartitions.get("partition-cloud-download");
    expect(partition?.status).toBe("stale");
    expect(partition?.sourceRevision).toBe(cloudUpdatedAt);
    const publishedSummary = await appDb.publishedSummaries.get(`${recordId}-full`);
    expect(publishedSummary?.freshness).toBe("stale");
    expect(publishedSummary?.staleReason).toBe("partition_boundary_change");
  });

  it("builds search index for pulled ghost records when transcript text is present", async () => {
    const recordId = "ghost-idx";
    const cloudRecord = buildLocalRecord(recordId, {
      isCloudSynced: true,
      updatedAt: new Date().toISOString(),
      transcriptText: "hello world",
    });
    const { service } = createPullDriveServiceMock(cloudRecord);
    const manager = new SyncManager(service);

    const summary = await manager.pullUpdates();
    expect(summary.failed).toBe(0);

    const stored = await appDb.transcriptions.get(recordId);
    expect(stored?.downloadStatus).toBe("not_downloaded");
    const searchIndex = await appDb.searchIndexes.get(recordId);
    expect(searchIndex).toBeTruthy();
    expect(searchIndex?.normalizedTranscript).toContain("hello");
  });

  it("keeps downloaded local state unchanged when newer cloud metadata lacks segments", async () => {
    const recordId = "cloud-missing-segments";
    const localUpdatedAt = new Date(Date.now() - 60_000).toISOString();
    const cloudUpdatedAt = new Date().toISOString();

    await appDb.transcriptions.put(
      buildLocalRecord(recordId, {
        isCloudSynced: true,
        downloadStatus: "downloaded",
        updatedAt: localUpdatedAt,
        transcriptText: "local transcript",
      })
    );
    await appDb.segments.add({
      id: "seg-missing-local",
      transcriptionId: recordId,
      startMs: 0,
      endMs: 1000,
      text: "local text",
      createdAt: localUpdatedAt,
    });

    const cloudRecord = buildLocalRecord(recordId, {
      isCloudSynced: true,
      updatedAt: cloudUpdatedAt,
      transcriptText: "cloud transcript",
    });
    const { service } = createPullDriveServiceMock(cloudRecord);
    const manager = new SyncManager(service);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const summary = await manager.pullUpdates();
    warnSpy.mockRestore();

    expect(summary.processed).toBe(1);
    expect(summary.failed).toBe(1);
    const stored = await appDb.transcriptions.get(recordId);
    expect(stored?.updatedAt).toBe(localUpdatedAt);
    expect(stored?.transcriptText).toBe("local transcript");
    const segments = await appDb.segments.where("transcriptionId").equals(recordId).toArray();
    expect(segments).toHaveLength(1);
    expect(segments[0]?.id).toBe("seg-missing-local");
  });

  it("clears stale local media when refreshing a newer downloaded cloud record", async () => {
    const recordId = "cloud-refresh-clears-stale-media";
    const localUpdatedAt = new Date(Date.now() - 60_000).toISOString();
    const cloudUpdatedAt = new Date().toISOString();

    await appDb.transcriptions.put(
      buildLocalRecord(recordId, {
        isCloudSynced: true,
        downloadStatus: "downloaded",
        updatedAt: localUpdatedAt,
        transcriptText: "local transcript",
      })
    );
    await appDb.segments.add({
      id: "seg-refresh-local",
      transcriptionId: recordId,
      startMs: 0,
      endMs: 1000,
      text: "local text",
      createdAt: localUpdatedAt,
    });
    await appDb.audioChunks.add({
      id: "audio-refresh-local",
      transcriptionId: recordId,
      chunkIndex: 0,
      data: new Uint8Array([1, 2, 3]).buffer,
      mimeType: "audio/webm",
      createdAt: localUpdatedAt,
    });
    await appDb.videoChunks.add({
      id: "video-refresh-local",
      transcriptionId: recordId,
      chunkIndex: 0,
      data: new Uint8Array([4, 5, 6]).buffer,
      mimeType: "video/webm",
      createdAt: localUpdatedAt,
    });

    const cloudRecord = buildLocalRecord(recordId, {
      isCloudSynced: true,
      updatedAt: cloudUpdatedAt,
      transcriptText: "cloud transcript",
    });
    const cloudSegments: LocalSegment[] = [
      {
        id: "seg-refresh-cloud",
        transcriptionId: recordId,
        startMs: 0,
        endMs: 1100,
        text: "cloud text",
        createdAt: cloudUpdatedAt,
      },
    ];
    const { service } = createPullDriveServiceMock(cloudRecord, { segments: cloudSegments });
    const manager = new SyncManager(service);

    const summary = await manager.pullUpdates();

    expect(summary.failed).toBe(0);
    await expect(appDb.audioChunks.where("transcriptionId").equals(recordId).count()).resolves.toBe(0);
    await expect(appDb.videoChunks.where("transcriptionId").equals(recordId).count()).resolves.toBe(0);
  });

  it("fails full download when cloud segments are missing instead of marking the record downloaded", async () => {
    const recordId = "cloud-download-missing";
    const localUpdatedAt = new Date(Date.now() - 60_000).toISOString();

    await appDb.transcriptions.put(
      buildLocalRecord(recordId, {
        isCloudSynced: true,
        downloadStatus: "downloaded",
        updatedAt: localUpdatedAt,
      })
    );
    await appDb.segments.add({
      id: "seg-download-missing-local",
      transcriptionId: recordId,
      startMs: 0,
      endMs: 1000,
      text: "local text",
      createdAt: localUpdatedAt,
    });

    const cloudRecord = buildLocalRecord(recordId, {
      isCloudSynced: true,
      updatedAt: new Date().toISOString(),
    });
    const { service } = createPullDriveServiceMock(cloudRecord);
    const manager = new SyncManager(service);

    await expect(manager.downloadFullRecord(recordId)).rejects.toThrow('Cloud segments are missing');

    const stored = await appDb.transcriptions.get(recordId);
    expect(stored?.downloadStatus).toBe("not_downloaded");
    const segments = await appDb.segments.where("transcriptionId").equals(recordId).toArray();
    expect(segments).toHaveLength(1);
    expect(segments[0]?.id).toBe("seg-download-missing-local");
  });

  it("clears stale local media artifacts when the cloud record no longer has them", async () => {
    const recordId = "cloud-download-clears-stale-media";
    const localUpdatedAt = new Date(Date.now() - 60_000).toISOString();
    const cloudUpdatedAt = new Date().toISOString();

    await appDb.transcriptions.put(
      buildLocalRecord(recordId, {
        isCloudSynced: true,
        downloadStatus: "downloaded",
        updatedAt: localUpdatedAt,
      })
    );
    await appDb.segments.add({
      id: "seg-media-local",
      transcriptionId: recordId,
      startMs: 0,
      endMs: 1000,
      text: "local text",
      createdAt: localUpdatedAt,
    });
    await appDb.audioChunks.add({
      id: "audio-local",
      transcriptionId: recordId,
      chunkIndex: 0,
      data: new Uint8Array([9, 9, 9]).buffer,
      mimeType: "audio/webm",
      createdAt: localUpdatedAt,
    });
    await appDb.videoChunks.add({
      id: "video-local",
      transcriptionId: recordId,
      chunkIndex: 0,
      data: new Uint8Array([8, 8, 8]).buffer,
      mimeType: "video/webm",
      createdAt: localUpdatedAt,
    });

    const cloudRecord = buildLocalRecord(recordId, {
      isCloudSynced: true,
      updatedAt: cloudUpdatedAt,
    });
    const cloudSegments: LocalSegment[] = [
      {
        id: "seg-media-cloud",
        transcriptionId: recordId,
        startMs: 0,
        endMs: 1000,
        text: "cloud text",
        createdAt: cloudUpdatedAt,
      },
    ];
    const { service } = createPullDriveServiceMock(cloudRecord, { segments: cloudSegments });
    const manager = new SyncManager(service);

    await manager.downloadFullRecord(recordId);

    const stored = await appDb.transcriptions.get(recordId);
    expect(stored?.downloadStatus).toBe("downloaded");
    await expect(appDb.audioChunks.where("transcriptionId").equals(recordId).count()).resolves.toBe(0);
    await expect(appDb.videoChunks.where("transcriptionId").equals(recordId).count()).resolves.toBe(0);
  });
});
