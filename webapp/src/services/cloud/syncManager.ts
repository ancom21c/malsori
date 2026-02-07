import { appDb } from "../../data/app-db";
import type { LocalTranscription, LocalSegment } from "../../data/app-db";
import { GoogleDriveService } from "./googleDriveService";
import { createWavBlobFromPcmChunks } from "../audio/wavBuilder";

const ROOT_FOLDER_NAME = "Malsori Data";
const DEFAULT_REALTIME_SAMPLE_RATE = 16000;
const SYNC_RETRY_BACKOFF_MS = [
    1 * 60 * 1000,
    5 * 60 * 1000,
    15 * 60 * 1000,
    60 * 60 * 1000,
    6 * 60 * 60 * 1000,
];

type SyncRunSummary = {
    processed: number;
    failed: number;
    skipped: number;
};

function isPcmMimeType(value: string | undefined): boolean {
    if (!value) {
        return false;
    }
    return value.toLowerCase().startsWith("audio/pcm");
}

function parseSampleRateFromMimeType(value: string | undefined): number | null {
    if (!value) {
        return null;
    }
    const match = value.match(/(?:^|;)\s*rate\s*=\s*(\d+)/i);
    if (!match) {
        return null;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseIsoMillis(value: string | undefined): number | null {
    if (!value) {
        return null;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function getRetryBackoffMillis(attempt: number): number {
    const normalizedAttempt = Number.isFinite(attempt) ? Math.max(1, Math.floor(attempt)) : 1;
    return SYNC_RETRY_BACKOFF_MS[Math.min(normalizedAttempt - 1, SYNC_RETRY_BACKOFF_MS.length - 1)];
}

function resolveSyncErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message.trim();
    }
    if (typeof error === "string" && error.trim().length > 0) {
        return error.trim();
    }
    return "Cloud sync failed";
}

function sanitizeCloudMetadata(record: LocalTranscription): LocalTranscription {
    return {
        ...record,
        syncRetryCount: undefined,
        nextSyncAttemptAt: undefined,
        syncErrorMessage: undefined,
        sourceFileStorageState: undefined,
        sourceFileChunkCount: undefined,
        sourceFileStoredBytes: undefined,
    };
}

function determineVideoFilename(mimeType: string | undefined): string {
    if (mimeType && mimeType.toLowerCase().includes("mp4")) {
        return "video.mp4";
    }
    return "video.webm";
}

function isRiffWavHeader(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 12) {
        return false;
    }
    const bytes = new Uint8Array(buffer, 0, 12);
    return (
        bytes[0] === 0x52 && // R
        bytes[1] === 0x49 && // I
        bytes[2] === 0x46 && // F
        bytes[3] === 0x46 && // F
        bytes[8] === 0x57 && // W
        bytes[9] === 0x41 && // A
        bytes[10] === 0x56 && // V
        bytes[11] === 0x45 // E
    );
}

function isWebmEbmlHeader(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 4) {
        return false;
    }
    const bytes = new Uint8Array(buffer, 0, 4);
    return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

export class SyncManager {
    private driveService: GoogleDriveService;
    private rootFolderId: string | null = null;

    constructor(driveService: GoogleDriveService) {
        this.driveService = driveService;
    }

    private async getRootFolder(): Promise<string> {
        if (this.rootFolderId) return this.rootFolderId;

        const query = `name = '${ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const files = await this.driveService.listFiles(query);

        if (files.length > 0) {
            this.rootFolderId = files[0].id;
        } else {
            const folder = await this.driveService.createFolder(ROOT_FOLDER_NAME);
            this.rootFolderId = folder.id;
        }
        return this.rootFolderId;
    }

    private async getTranscriptionsFolder(): Promise<string> {
        const rootId = await this.getRootFolder();
        const query = `name = 'transcriptions' and mimeType = 'application/vnd.google-apps.folder' and '${rootId}' in parents and trashed = false`;
        const files = await this.driveService.listFiles(query);

        if (files.length > 0) {
            return files[0].id;
        } else {
            const folder = await this.driveService.createFolder("transcriptions", rootId);
            return folder.id;
        }
    }

    async getAccountKey(): Promise<string> {
        return await this.getRootFolder();
    }

    async pullUpdates(): Promise<SyncRunSummary> {
        let processed = 0;
        let failed = 0;
        let skipped = 0;
        const transcriptionsFolderId = await this.getTranscriptionsFolder();
        const query = `'${transcriptionsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const cloudFolders = await this.driveService.listFiles(query);

        for (const folder of cloudFolders) {
            const transcriptionId = folder.name;
            processed += 1;
            try {
                const syncedAt = new Date().toISOString();
                // Check if exists locally
                const localRecord = await appDb.transcriptions.get(transcriptionId);

                // Get metadata.json from cloud folder
                const metadataQuery = `name = 'metadata.json' and '${folder.id}' in parents and trashed = false`;
                const metadataFiles = await this.driveService.listFiles(metadataQuery);

                if (metadataFiles.length === 0) {
                    skipped += 1;
                    continue;
                }

                const metadataBlob = await this.driveService.downloadFile(metadataFiles[0].id);
                const metadataText = await metadataBlob.text();
                const cloudMetadata: LocalTranscription = JSON.parse(metadataText);

                if (!localRecord) {
                    // Create Ghost Record
                    await appDb.transcriptions.put({
                        ...sanitizeCloudMetadata(cloudMetadata),
                        isCloudSynced: true,
                        downloadStatus: "not_downloaded",
                        lastSyncedAt: syncedAt,
                    });
                } else if (localRecord.isCloudSynced) {
                    // Update if cloud is newer
                    const localUpdate = parseIsoMillis(localRecord.updatedAt) ?? 0;
                    const cloudUpdate = parseIsoMillis(cloudMetadata.updatedAt) ?? 0;

                    if (cloudUpdate > localUpdate) {
                        await appDb.transcriptions.update(transcriptionId, {
                            ...sanitizeCloudMetadata(cloudMetadata),
                            isCloudSynced: true,
                            lastSyncedAt: syncedAt,
                            // Keep local download status unless we want to force re-download?
                            // For now, just update metadata fields.
                        });
                    }
                }
            } catch (error) {
                failed += 1;
                console.warn(`Failed to pull cloud record "${transcriptionId}".`, error);
            }
        }
        return { processed, failed, skipped };
    }

    async pushUpdates(): Promise<SyncRunSummary> {
        let processed = 0;
        let failed = 0;
        let skipped = 0;
        const transcriptionsFolderId = await this.getTranscriptionsFolder();
        const localRecords = await appDb.transcriptions
            .filter((record) =>
                record.isCloudSynced === true &&
                record.downloadStatus !== "not_downloaded" &&
                record.downloadStatus !== "downloading"
            )
            .toArray();

        for (const record of localRecords) {
            const nextAttemptAt = parseIsoMillis(record.nextSyncAttemptAt);
            if (nextAttemptAt !== null && nextAttemptAt > Date.now()) {
                skipped += 1;
                continue;
            }
            processed += 1;
            try {
                const syncedAt = new Date().toISOString();
                // Check if folder exists
                const query = `name = '${record.id}' and '${transcriptionsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
                const folders = await this.driveService.listFiles(query);

                let folderId: string;
                if (folders.length > 0) {
                    folderId = folders[0].id;
                } else {
                    const folder = await this.driveService.createFolder(record.id, transcriptionsFolderId);
                    folderId = folder.id;
                }

                // Avoid overwriting newer cloud metadata with stale/local-only state.
                const localUpdated = parseIsoMillis(record.updatedAt);
                const cloudMetadataQuery = `name = 'metadata.json' and '${folderId}' in parents and trashed = false`;
                const cloudMetadataFiles = await this.driveService.listFiles(cloudMetadataQuery);
                const cloudUpdated = parseIsoMillis(cloudMetadataFiles[0]?.modifiedTime);
                if (localUpdated !== null && cloudUpdated !== null && cloudUpdated > localUpdated) {
                    await appDb.transcriptions.update(record.id, {
                        syncRetryCount: undefined,
                        nextSyncAttemptAt: undefined,
                        syncErrorMessage: undefined,
                        lastSyncedAt: syncedAt,
                    });
                    continue;
                }

                // Upload metadata.json
                const cloudMetadata = sanitizeCloudMetadata(record);
                const metadataBlob = new Blob([JSON.stringify(cloudMetadata)], { type: "application/json" });
                await this.uploadOrUpdateFile("metadata.json", metadataBlob, folderId, "application/json");

                // Upload segments.json
                const segments = await appDb.segments.where("transcriptionId").equals(record.id).toArray();
                const segmentsBlob = new Blob([JSON.stringify(segments)], { type: "application/json" });
                await this.uploadOrUpdateFile("segments.json", segmentsBlob, folderId, "application/json");

                // Upload Media Files (Audio/Video)
                await this.uploadMediaFiles(record, folderId);
                await appDb.transcriptions.update(record.id, {
                    isCloudSynced: true,
                    lastSyncedAt: syncedAt,
                    syncRetryCount: undefined,
                    nextSyncAttemptAt: undefined,
                    syncErrorMessage: undefined,
                });
            } catch (error) {
                failed += 1;
                const currentRetryCount =
                    typeof record.syncRetryCount === "number" && Number.isFinite(record.syncRetryCount)
                        ? Math.max(0, Math.floor(record.syncRetryCount))
                        : 0;
                const nextRetryCount = currentRetryCount + 1;
                await appDb.transcriptions.update(record.id, {
                    syncRetryCount: nextRetryCount,
                    nextSyncAttemptAt: new Date(Date.now() + getRetryBackoffMillis(nextRetryCount)).toISOString(),
                    syncErrorMessage: resolveSyncErrorMessage(error),
                });
                console.warn(`Failed to push cloud record "${record.id}".`, error);
            }
        }
        return { processed, failed, skipped };
    }

    private async uploadMediaFiles(record: LocalTranscription, folderId: string) {
        // Audio
        const audioChunks = (
            await appDb.audioChunks.where("transcriptionId").equals(record.id).sortBy("chunkIndex")
        ).filter((chunk) => chunk.role !== "source_file");
        if (audioChunks.length > 0) {
            const sourceMimeType = audioChunks.find((chunk) => chunk.mimeType)?.mimeType;
            const firstChunk = audioChunks[0]?.data;
            const normalizedMimeType = sourceMimeType ? sourceMimeType.toLowerCase() : "";
            const mimeLooksEncoded =
                !firstChunk
                    ? true
                    : normalizedMimeType.includes("wav")
                        ? isRiffWavHeader(firstChunk)
                        : normalizedMimeType.includes("webm")
                            ? isWebmEbmlHeader(firstChunk)
                            : true;

            if (!sourceMimeType || isPcmMimeType(sourceMimeType)) {
                const sampleRate =
                    record.audioSampleRate ??
                    parseSampleRateFromMimeType(sourceMimeType) ??
                    DEFAULT_REALTIME_SAMPLE_RATE;
                const channels = record.audioChannels ?? 1;
                const wavBlob = createWavBlobFromPcmChunks(
                    audioChunks.map((chunk) => chunk.data),
                    sampleRate,
                    channels
                );
                if (wavBlob) {
                    await this.uploadOrUpdateFile("audio.wav", wavBlob, folderId, "audio/wav");
                }
            } else if (sourceMimeType.toLowerCase().includes("wav") && mimeLooksEncoded) {
                const audioBlob = new Blob(audioChunks.map((c) => c.data), { type: "audio/wav" });
                await this.uploadOrUpdateFile("audio.wav", audioBlob, folderId, "audio/wav");
            } else if (sourceMimeType.toLowerCase().includes("webm") && mimeLooksEncoded) {
                const audioBlob = new Blob(audioChunks.map((c) => c.data), { type: "audio/webm" });
                await this.uploadOrUpdateFile("audio.webm", audioBlob, folderId, "audio/webm");
            } else {
                const sampleRate =
                    record.audioSampleRate ??
                    parseSampleRateFromMimeType(sourceMimeType) ??
                    DEFAULT_REALTIME_SAMPLE_RATE;
                const channels = record.audioChannels ?? 1;
                const wavBlob = createWavBlobFromPcmChunks(
                    audioChunks.map((chunk) => chunk.data),
                    sampleRate,
                    channels
                );
                if (wavBlob) {
                    await this.uploadOrUpdateFile("audio.wav", wavBlob, folderId, "audio/wav");
                }
            }
        }

        // Video
        const videoChunks = await appDb.videoChunks.where("transcriptionId").equals(record.id).sortBy("chunkIndex");
        if (videoChunks.length > 0) {
            const mimeType = videoChunks.find((chunk) => chunk.mimeType)?.mimeType ?? "video/webm";
            const videoName = determineVideoFilename(mimeType);
            const videoBlob = new Blob(videoChunks.map((c) => c.data), { type: mimeType });
            await this.uploadOrUpdateFile(videoName, videoBlob, folderId, mimeType);
        }
    }

    private async uploadOrUpdateFile(name: string, blob: Blob, parentId: string, mimeType: string) {
        const query = `name = '${name}' and '${parentId}' in parents and trashed = false`;
        const files = await this.driveService.listFiles(query);

        if (files.length > 0) {
            await this.driveService.uploadFile(name, blob, parentId, mimeType, files[0].id);
        } else {
            await this.driveService.uploadFile(name, blob, parentId, mimeType);
        }
    }

    async downloadFullRecord(transcriptionId: string) {
        const transcriptionsFolderId = await this.getTranscriptionsFolder();
        const query = `name = '${transcriptionId}' and '${transcriptionsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const folders = await this.driveService.listFiles(query);

        if (folders.length === 0) throw new Error("Cloud record not found");
        const folderId = folders[0].id;

        await appDb.transcriptions.update(transcriptionId, { downloadStatus: "downloading" });

        try {
            // Download segments.json
            const segmentsQuery = `name = 'segments.json' and '${folderId}' in parents and trashed = false`;
            const segmentsFiles = await this.driveService.listFiles(segmentsQuery);
            if (segmentsFiles.length > 0) {
                const blob = await this.driveService.downloadFile(segmentsFiles[0].id);
                const text = await blob.text();
                const segments: LocalSegment[] = JSON.parse(text);

                await appDb.transaction("rw", appDb.segments, async () => {
                    await appDb.segments.where("transcriptionId").equals(transcriptionId).delete();
                    await appDb.segments.bulkAdd(segments);
                });
            }

            // Download Media Files
            await this.downloadMediaFiles(transcriptionId, folderId);

            // Update status
            await appDb.transcriptions.update(transcriptionId, {
                downloadStatus: "downloaded",
                lastSyncedAt: new Date().toISOString(),
            });
        } catch (error) {
            await appDb.transcriptions.update(transcriptionId, { downloadStatus: "not_downloaded" });
            throw error;
        }
    }

    private async downloadMediaFiles(transcriptionId: string, folderId: string) {
        // Audio
        const audioQuery = `(name = 'audio.wav' or name = 'audio.webm') and '${folderId}' in parents and trashed = false`;
        const audioFiles = await this.driveService.listFiles(audioQuery);
        if (audioFiles.length > 0) {
            const file =
                audioFiles.find((entry) => entry.name === "audio.wav") ??
                audioFiles.find((entry) => entry.name === "audio.webm") ??
                audioFiles[0];
            const blob = await this.driveService.downloadFile(file.id);
            const buffer = await blob.arrayBuffer();
            // Store as a single chunk for simplicity
            await appDb.transaction("rw", appDb.audioChunks, async () => {
                await appDb.audioChunks.where("transcriptionId").equals(transcriptionId).delete();
                await appDb.audioChunks.add({
                    id: crypto.randomUUID(),
                    transcriptionId,
                    chunkIndex: 0,
                    data: buffer,
                    mimeType: file.mimeType,
                    createdAt: new Date().toISOString(),
                });
            });
        }

        // Video
        const videoQuery = `(name = 'video.webm' or name = 'video.mp4') and '${folderId}' in parents and trashed = false`;
        const videoFiles = await this.driveService.listFiles(videoQuery);
        if (videoFiles.length > 0) {
            const file =
                videoFiles.find((entry) => entry.name === "video.webm") ??
                videoFiles.find((entry) => entry.name === "video.mp4") ??
                videoFiles[0];
            const blob = await this.driveService.downloadFile(file.id);
            const buffer = await blob.arrayBuffer();
            await appDb.transaction("rw", appDb.videoChunks, async () => {
                await appDb.videoChunks.where("transcriptionId").equals(transcriptionId).delete();
                await appDb.videoChunks.add({
                    id: crypto.randomUUID(),
                    transcriptionId,
                    chunkIndex: 0,
                    data: buffer,
                    mimeType: file.mimeType,
                    createdAt: new Date().toISOString(),
                });
            });
        }
    }
}
