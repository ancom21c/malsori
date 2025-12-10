import { appDb } from "../../data/app-db";
import type { LocalTranscription, LocalSegment } from "../../data/app-db";
import { GoogleDriveService } from "./googleDriveService";

const ROOT_FOLDER_NAME = "Malsori Data";

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

    async pullUpdates() {
        const transcriptionsFolderId = await this.getTranscriptionsFolder();
        const query = `'${transcriptionsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const cloudFolders = await this.driveService.listFiles(query);

        for (const folder of cloudFolders) {
            // Folder name is the UUID of the transcription
            const transcriptionId = folder.name;

            // Check if exists locally
            const localRecord = await appDb.transcriptions.get(transcriptionId);

            // Get metadata.json from cloud folder
            const metadataQuery = `name = 'metadata.json' and '${folder.id}' in parents and trashed = false`;
            const metadataFiles = await this.driveService.listFiles(metadataQuery);

            if (metadataFiles.length === 0) continue;

            const metadataBlob = await this.driveService.downloadFile(metadataFiles[0].id);
            const metadataText = await metadataBlob.text();
            const cloudMetadata: LocalTranscription = JSON.parse(metadataText);

            if (!localRecord) {
                // Create Ghost Record
                await appDb.transcriptions.put({
                    ...cloudMetadata,
                    isCloudSynced: true,
                    downloadStatus: "not_downloaded",
                });
            } else if (localRecord.isCloudSynced) {
                // Update if cloud is newer
                const localUpdate = new Date(localRecord.updatedAt).getTime();
                const cloudUpdate = new Date(cloudMetadata.updatedAt).getTime();

                if (cloudUpdate > localUpdate) {
                    await appDb.transcriptions.update(transcriptionId, {
                        ...cloudMetadata,
                        isCloudSynced: true,
                        // Keep local download status unless we want to force re-download?
                        // For now, just update metadata fields.
                    });
                }
            }
        }
    }

    async pushUpdates() {
        const transcriptionsFolderId = await this.getTranscriptionsFolder();
        const localRecords = await appDb.transcriptions
            .filter((record) => record.isCloudSynced === true)
            .toArray();

        for (const record of localRecords) {
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

            // Upload metadata.json
            const metadataBlob = new Blob([JSON.stringify(record)], { type: "application/json" });
            await this.uploadOrUpdateFile("metadata.json", metadataBlob, folderId, "application/json");

            // Upload segments.json
            const segments = await appDb.segments.where("transcriptionId").equals(record.id).toArray();
            const segmentsBlob = new Blob([JSON.stringify(segments)], { type: "application/json" });
            await this.uploadOrUpdateFile("segments.json", segmentsBlob, folderId, "application/json");

            // Upload Media Files (Audio/Video)
            await this.uploadMediaFiles(record, folderId);
        }
    }

    private async uploadMediaFiles(record: LocalTranscription, folderId: string) {
        // Audio
        const audioChunks = await appDb.audioChunks.where("transcriptionId").equals(record.id).sortBy("chunkIndex");
        if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks.map(c => c.data), { type: "audio/webm" });
            await this.uploadOrUpdateFile("audio.webm", audioBlob, folderId, "audio/webm");
        }

        // Video
        const videoChunks = await appDb.videoChunks.where("transcriptionId").equals(record.id).sortBy("chunkIndex");
        if (videoChunks.length > 0) {
            const videoBlob = new Blob(videoChunks.map(c => c.data), { type: "video/webm" });
            await this.uploadOrUpdateFile("video.webm", videoBlob, folderId, "video/webm");
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
        await appDb.transcriptions.update(transcriptionId, { downloadStatus: "downloaded" });
    }

    private async downloadMediaFiles(transcriptionId: string, folderId: string) {
        // Audio
        const audioQuery = `name = 'audio.webm' and '${folderId}' in parents and trashed = false`;
        const audioFiles = await this.driveService.listFiles(audioQuery);
        if (audioFiles.length > 0) {
            const blob = await this.driveService.downloadFile(audioFiles[0].id);
            const buffer = await blob.arrayBuffer();
            // Store as a single chunk for simplicity
            await appDb.transaction("rw", appDb.audioChunks, async () => {
                await appDb.audioChunks.where("transcriptionId").equals(transcriptionId).delete();
                await appDb.audioChunks.add({
                    id: crypto.randomUUID(),
                    transcriptionId,
                    chunkIndex: 0,
                    data: buffer,
                    createdAt: new Date().toISOString(),
                });
            });
        }

        // Video
        const videoQuery = `name = 'video.webm' and '${folderId}' in parents and trashed = false`;
        const videoFiles = await this.driveService.listFiles(videoQuery);
        if (videoFiles.length > 0) {
            const blob = await this.driveService.downloadFile(videoFiles[0].id);
            const buffer = await blob.arrayBuffer();
            await appDb.transaction("rw", appDb.videoChunks, async () => {
                await appDb.videoChunks.where("transcriptionId").equals(transcriptionId).delete();
                await appDb.videoChunks.add({
                    id: crypto.randomUUID(),
                    transcriptionId,
                    chunkIndex: 0,
                    data: buffer,
                    createdAt: new Date().toISOString(),
                });
            });
        }
    }
}
