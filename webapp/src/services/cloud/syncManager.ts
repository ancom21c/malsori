import { appDb } from "../../data/app-db";
import type { LocalTranscription, LocalSegment } from "../../data/app-db";
import { GoogleDriveService, type DriveFile } from "./googleDriveService";
import { createWavBlobFromPcmChunks } from "../audio/wavBuilder";
import { markSummaryStateStaleByMutation } from "../data/summaryRepository";
import { normalizeSearchText, extractSearchTokens, buildCharNgrams } from "../../utils/textIndexing";

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
        searchTitle: undefined,
        searchTranscript: undefined,
        isCloudSynced: undefined,
        downloadStatus: undefined,
        lastSyncedAt: undefined,
        syncRetryCount: undefined,
        nextSyncAttemptAt: undefined,
        syncErrorMessage: undefined,
        sourceFileStorageState: undefined,
        sourceFileChunkCount: undefined,
        sourceFileStoredBytes: undefined,
    };
}

function canonicalizeCloudMetadata(
    transcriptionId: string,
    record: LocalTranscription
): LocalTranscription {
    return {
        ...sanitizeCloudMetadata(record),
        id: transcriptionId,
        searchTitle: normalizeSearchText(record.title),
        searchTranscript: normalizeSearchText(record.transcriptText),
    };
}

async function upsertTranscriptionSearchIndex(
    transcriptionId: string,
    transcriptText: string | undefined
) {
    const normalized = normalizeSearchText(transcriptText);
    if (!normalized) {
        await appDb.searchIndexes.delete(transcriptionId);
        return;
    }
    const now = new Date().toISOString();
    const tokenSet = extractSearchTokens(normalized);
    const ngramSet = buildCharNgrams(normalized, 3);
    await appDb.searchIndexes.put({
        transcriptionId,
        normalizedTranscript: normalized,
        tokenSet,
        ngramSet,
        updatedAt: now,
    });
}

async function replaceCloudSegmentsWithStateGuard(input: {
    transcriptionId: string;
    segments: LocalSegment[];
    sourceRevision: string;
    staleAt?: string;
}) {
    await appDb.transaction("rw", [appDb.segments, appDb.turnTranslations], async () => {
        await appDb.turnTranslations.where("sessionId").equals(input.transcriptionId).delete();
        await appDb.segments.where("transcriptionId").equals(input.transcriptionId).delete();
        if (input.segments.length > 0) {
            await appDb.segments.bulkAdd(
                input.segments.map((segment) => ({
                    ...segment,
                    transcriptionId: input.transcriptionId,
                }))
            );
        }
    });
    await markSummaryStateStaleByMutation({
        sessionId: input.transcriptionId,
        sourceRevision: input.sourceRevision,
        trigger: "partition_boundary_change",
        staleAt: input.staleAt,
    });
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
                const normalizedCloudMetadata = canonicalizeCloudMetadata(transcriptionId, cloudMetadata);

                if (!localRecord) {
                    // Create Ghost Record
                    await appDb.transaction("rw", [appDb.transcriptions, appDb.searchIndexes], async () => {
                        await appDb.transcriptions.put({
                            ...normalizedCloudMetadata,
                            isCloudSynced: true,
                            downloadStatus: "not_downloaded",
                            lastSyncedAt: syncedAt,
                        });
                        await upsertTranscriptionSearchIndex(
                            transcriptionId,
                            normalizedCloudMetadata.transcriptText
                        );
                    });
                } else if (localRecord.isCloudSynced) {
                    // Update if cloud is newer
                    const localUpdate = parseIsoMillis(localRecord.updatedAt) ?? 0;
                    const cloudUpdate = parseIsoMillis(normalizedCloudMetadata.updatedAt) ?? 0;

                    if (cloudUpdate > localUpdate) {
                        let nextSegments: LocalSegment[] | null = null;
                        if (localRecord.downloadStatus === "downloaded") {
                            nextSegments = await this.downloadCloudSegments(folder.id, transcriptionId);
                            await this.downloadMediaFiles(transcriptionId, folder.id);
                        }

                        await appDb.transaction(
                            "rw",
                            [appDb.transcriptions, appDb.searchIndexes, appDb.segments],
                            async () => {
                                await appDb.transcriptions.update(transcriptionId, {
                                    ...normalizedCloudMetadata,
                                    isCloudSynced: true,
                                    downloadStatus: localRecord.downloadStatus,
                                    lastSyncedAt: syncedAt,
                                });
                                await upsertTranscriptionSearchIndex(
                                    transcriptionId,
                                    normalizedCloudMetadata.transcriptText
                                );
                            }
                        );
                        if (nextSegments) {
                            await replaceCloudSegmentsWithStateGuard({
                                transcriptionId,
                                segments: nextSegments,
                                sourceRevision: normalizedCloudMetadata.updatedAt,
                                staleAt: syncedAt,
                            });
                        }
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
                let cloudUpdated: number | null = null;
                if (cloudMetadataFiles.length > 0) {
                    const metadataBlob = await this.driveService.downloadFile(cloudMetadataFiles[0].id);
                    const metadataText = await metadataBlob.text();
                    const cloudMetadata = canonicalizeCloudMetadata(
                        record.id,
                        JSON.parse(metadataText) as LocalTranscription
                    );
                    cloudUpdated = parseIsoMillis(cloudMetadata.updatedAt);
                }
                if (localUpdated !== null && cloudUpdated !== null && cloudUpdated > localUpdated) {
                    await appDb.transcriptions.update(record.id, {
                        syncRetryCount: undefined,
                        nextSyncAttemptAt: undefined,
                        syncErrorMessage: undefined,
                        lastSyncedAt: syncedAt,
                    });
                    continue;
                }

                // Upload segments.json
                const segments = await appDb.segments.where("transcriptionId").equals(record.id).toArray();
                const segmentsBlob = new Blob([JSON.stringify(segments)], { type: "application/json" });
                await this.uploadOrUpdateFile("segments.json", segmentsBlob, folderId, "application/json");

                // Upload Media Files (Audio/Video)
                await this.uploadMediaFiles(record, folderId);
                // Publish metadata last so other clients only observe the new revision
                // after its dependent artifacts have been written successfully.
                const cloudMetadata = sanitizeCloudMetadata(record);
                const metadataBlob = new Blob([JSON.stringify(cloudMetadata)], { type: "application/json" });
                await this.uploadOrUpdateFile("metadata.json", metadataBlob, folderId, "application/json");
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
        const audioFilenames = ["audio.wav", "audio.webm"] as const;
        const videoFilenames = ["video.webm", "video.mp4"] as const;

        // Audio
        const audioChunks = (
            await appDb.audioChunks.where("transcriptionId").equals(record.id).sortBy("chunkIndex")
        ).filter((chunk) => chunk.role !== "source_file");
        let uploadedAudioName: (typeof audioFilenames)[number] | null = null;
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
                    uploadedAudioName = "audio.wav";
                }
            } else if (sourceMimeType.toLowerCase().includes("wav") && mimeLooksEncoded) {
                const audioBlob = new Blob(audioChunks.map((c) => c.data), { type: "audio/wav" });
                await this.uploadOrUpdateFile("audio.wav", audioBlob, folderId, "audio/wav");
                uploadedAudioName = "audio.wav";
            } else if (sourceMimeType.toLowerCase().includes("webm") && mimeLooksEncoded) {
                const audioBlob = new Blob(audioChunks.map((c) => c.data), { type: "audio/webm" });
                await this.uploadOrUpdateFile("audio.webm", audioBlob, folderId, "audio/webm");
                uploadedAudioName = "audio.webm";
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
                    uploadedAudioName = "audio.wav";
                }
            }
            if (uploadedAudioName) {
                await this.deleteRemoteFiles(
                    audioFilenames.filter((name) => name !== uploadedAudioName),
                    folderId
                );
            }
        } else {
            await this.deleteRemoteFiles([...audioFilenames], folderId);
        }

        // Video
        const videoChunks = await appDb.videoChunks.where("transcriptionId").equals(record.id).sortBy("chunkIndex");
        if (videoChunks.length > 0) {
            const mimeType = videoChunks.find((chunk) => chunk.mimeType)?.mimeType ?? "video/webm";
            const videoName = determineVideoFilename(mimeType);
            const videoBlob = new Blob(videoChunks.map((c) => c.data), { type: mimeType });
            await this.uploadOrUpdateFile(videoName, videoBlob, folderId, mimeType);
            await this.deleteRemoteFiles(videoFilenames.filter((name) => name !== videoName), folderId);
        } else {
            await this.deleteRemoteFiles([...videoFilenames], folderId);
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

    private async deleteRemoteFiles(names: string[], parentId: string) {
        if (names.length === 0) {
            return;
        }
        const query = `(${names.map((name) => `name = '${name}'`).join(" or ")}) and '${parentId}' in parents and trashed = false`;
        const files = await this.driveService.listFiles(query);
        await Promise.all(files.map((file) => this.driveService.deleteFile(file.id)));
    }

    private async downloadCloudSegments(folderId: string, transcriptionId: string): Promise<LocalSegment[]> {
        const segmentsQuery = `name = 'segments.json' and '${folderId}' in parents and trashed = false`;
        const segmentsFiles = await this.driveService.listFiles(segmentsQuery);
        if (segmentsFiles.length === 0) {
            throw new Error(`Cloud segments are missing for "${transcriptionId}"`);
        }
        const blob = await this.driveService.downloadFile(segmentsFiles[0].id);
        const text = await blob.text();
        const parsed: unknown = JSON.parse(text);
        if (!Array.isArray(parsed)) {
            throw new Error(`Cloud segments are invalid for "${transcriptionId}"`);
        }
        return parsed as LocalSegment[];
    }

    async downloadFullRecord(transcriptionId: string) {
        const transcriptionsFolderId = await this.getTranscriptionsFolder();
        const query = `name = '${transcriptionId}' and '${transcriptionsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const folders = await this.driveService.listFiles(query);

        if (folders.length === 0) throw new Error("Cloud record not found");
        const folderId = folders[0].id;

        await appDb.transcriptions.update(transcriptionId, { downloadStatus: "downloading" });

        try {
            const metadataQuery = `name = 'metadata.json' and '${folderId}' in parents and trashed = false`;
            const metadataFiles = await this.driveService.listFiles(metadataQuery);
            if (metadataFiles.length === 0) {
                throw new Error(`Cloud metadata is missing for "${transcriptionId}"`);
            }
            const metadataBlob = await this.driveService.downloadFile(metadataFiles[0].id);
            const metadataText = await metadataBlob.text();
            const cloudMetadata = canonicalizeCloudMetadata(
                transcriptionId,
                JSON.parse(metadataText) as LocalTranscription
            );
            // Download segments.json
            const segments = await this.downloadCloudSegments(folderId, transcriptionId);
            const media = await this.downloadRemoteMediaFiles(folderId);
            const sourceRevision = cloudMetadata.updatedAt ?? new Date().toISOString();
            await replaceCloudSegmentsWithStateGuard({
                transcriptionId,
                segments,
                sourceRevision,
                staleAt: new Date().toISOString(),
            });

            // Download Media Files
            await this.replaceLocalMediaFiles(transcriptionId, media);

            // Update status and local metadata projection to the downloaded cloud truth.
            const syncedAt = new Date().toISOString();
            await appDb.transaction("rw", [appDb.transcriptions, appDb.searchIndexes], async () => {
                await appDb.transcriptions.update(transcriptionId, {
                    ...cloudMetadata,
                    isCloudSynced: true,
                    downloadStatus: "downloaded",
                    lastSyncedAt: syncedAt,
                });
                await upsertTranscriptionSearchIndex(transcriptionId, cloudMetadata.transcriptText);
            });
        } catch (error) {
            await appDb.transcriptions.update(transcriptionId, { downloadStatus: "not_downloaded" });
            throw error;
        }
    }

    private async downloadMediaFiles(transcriptionId: string, folderId: string) {
        const media = await this.downloadRemoteMediaFiles(folderId);
        await this.replaceLocalMediaFiles(transcriptionId, media);
    }

    private async downloadRemoteMediaFiles(folderId: string): Promise<{
        audio: { data: ArrayBuffer; mimeType?: string } | null;
        video: { data: ArrayBuffer; mimeType?: string } | null;
    }> {
        const audio = await this.downloadRemoteMediaFile(
            `(name = 'audio.wav' or name = 'audio.webm') and '${folderId}' in parents and trashed = false`,
            (files) =>
                files.find((entry) => entry.name === "audio.wav") ??
                files.find((entry) => entry.name === "audio.webm") ??
                files[0]
        );
        const video = await this.downloadRemoteMediaFile(
            `(name = 'video.webm' or name = 'video.mp4') and '${folderId}' in parents and trashed = false`,
            (files) =>
                files.find((entry) => entry.name === "video.webm") ??
                files.find((entry) => entry.name === "video.mp4") ??
                files[0]
        );
        return { audio, video };
    }

    private async replaceLocalMediaFiles(
        transcriptionId: string,
        media: {
            audio: { data: ArrayBuffer; mimeType?: string } | null;
            video: { data: ArrayBuffer; mimeType?: string } | null;
        }
    ) {
        const now = new Date().toISOString();
        await appDb.transaction("rw", [appDb.audioChunks, appDb.videoChunks], async () => {
            await appDb.audioChunks.where("transcriptionId").equals(transcriptionId).delete();
            if (media.audio) {
                await appDb.audioChunks.add({
                    id: crypto.randomUUID(),
                    transcriptionId,
                    chunkIndex: 0,
                    data: media.audio.data,
                    mimeType: media.audio.mimeType,
                    createdAt: now,
                });
            }

            await appDb.videoChunks.where("transcriptionId").equals(transcriptionId).delete();
            if (media.video) {
                await appDb.videoChunks.add({
                    id: crypto.randomUUID(),
                    transcriptionId,
                    chunkIndex: 0,
                    data: media.video.data,
                    mimeType: media.video.mimeType,
                    createdAt: now,
                });
            }
        });
    }

    private async downloadRemoteMediaFile(
        query: string,
        selectFile: (files: DriveFile[]) => DriveFile | undefined
    ): Promise<{ data: ArrayBuffer; mimeType?: string } | null> {
        const files = await this.driveService.listFiles(query);
        if (files.length === 0) {
            return null;
        }
        const file = selectFile(files);
        if (!file) {
            return null;
        }
        const blob = await this.driveService.downloadFile(file.id);
        return {
            data: await blob.arrayBuffer(),
            mimeType: file.mimeType,
        };
    }
}
