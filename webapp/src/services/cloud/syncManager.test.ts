import { beforeEach, describe, expect, it, vi } from "vitest";
import { appDb, type LocalTranscription } from "../../data/app-db";
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

function createPullDriveServiceMock(cloudRecord: LocalTranscription) {
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
});
