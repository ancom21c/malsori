import Dexie from "dexie";
import type { Table } from "dexie";

export type LocalTranscriptionKind = "file" | "realtime";

export type BackendEndpointDeployment = "cloud" | "onprem";

export interface LocalTranscription {
  id: string;
  title: string;
  kind: LocalTranscriptionKind;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  remoteId?: string;
  durationMs?: number;
  audioBlobKey?: string;
  audioSampleRate?: number;
  audioChannels?: number;
  remoteAudioUrl?: string;
  errorMessage?: string;
  transcriptText?: string;
  configPresetId?: string;
  configPresetName?: string;
  modelName?: string;
  backendEndpointId?: string | null;
  backendEndpointName?: string;
  backendEndpointSource?: "preset" | "server-default" | "unknown";
  backendDeployment?: BackendEndpointDeployment;
  backendApiBaseUrl?: string;
  searchTitle?: string;
  searchTranscript?: string;
  isCloudSynced?: boolean;
  downloadStatus?: "not_downloaded" | "downloading" | "downloaded";
  lastSyncedAt?: string;
}

export interface LocalWordTiming {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

export interface LocalSegment {
  id: string;
  transcriptionId: string;
  spk?: string;
  speaker_label?: string;
  language?: string;
  startMs: number;
  endMs: number;
  text: string;
  rawText?: string;
  correctedText?: string;
  isPartial?: boolean;
  isFinal?: boolean;
  hasTiming?: boolean;
  words?: LocalWordTiming[];
  createdAt: string;
}

export interface LocalAudioChunk {
  id: string;
  transcriptionId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  mimeType?: string;
  createdAt: string;
}

export interface LocalVideoChunk {
  id: string;
  transcriptionId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  mimeType?: string;
  createdAt: string;
}

export interface PresetConfig {
  id: string;
  type: "file" | "streaming";
  name: string;
  description?: string;
  configJson: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackendEndpointPreset {
  id: string;
  name: string;
  description?: string;
  deployment: BackendEndpointDeployment;
  apiBaseUrl: string;
  clientId?: string;
  clientSecret?: string;
  verifySsl?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface TranscriptionSearchIndex {
  transcriptionId: string;
  normalizedTranscript?: string;
  tokenSet?: string[];
  ngramSet?: string[];
  updatedAt: string;
}

class AppDatabase extends Dexie {
  transcriptions!: Table<LocalTranscription, string>;
  segments!: Table<LocalSegment, string>;
  audioChunks!: Table<LocalAudioChunk, string>;
  videoChunks!: Table<LocalVideoChunk, string>;
  presets!: Table<PresetConfig, string>;
  settings!: Table<AppSetting, string>;
  backendEndpoints!: Table<BackendEndpointPreset, string>;
  searchIndexes!: Table<TranscriptionSearchIndex, string>;

  constructor() {
    super("rtzr-stt-webapp");

    this.version(1).stores({
      transcriptions: "id, createdAt, kind, status",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
    });

    this.version(2)
      .stores({
        transcriptions: "id, createdAt, kind, status",
        segments: "id, transcriptionId, startMs",
        audioChunks: "id, transcriptionId, chunkIndex",
        presets: "id, type, isDefault",
        settings: "key",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table("audioChunks")
          .toCollection()
          .modify(async (chunk) => {
            const legacyBlob = (chunk as { blob?: Blob }).blob;
            if (legacyBlob && !(chunk as { data?: ArrayBuffer }).data) {
              try {
                const buffer = await legacyBlob.arrayBuffer();
                (chunk as { data: ArrayBuffer }).data = buffer;
              } catch (error) {
                console.warn("Failed to migrate legacy audio blob.", error);
              }
            }
            delete (chunk as { blob?: Blob }).blob;
          });
      });

    this.version(3).stores({
      transcriptions: "id, createdAt, kind, status",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
    });

    this.version(4).stores({
      transcriptions: "id, createdAt, kind, status",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
      searchIndexes: "transcriptionId",
    });

    this.version(5)
      .stores({
        transcriptions: "id, createdAt, kind, status",
        segments: "id, transcriptionId, startMs",
        audioChunks: "id, transcriptionId, chunkIndex",
        presets: "id, type, isDefault",
        settings: "key",
        backendEndpoints: "id, deployment, isDefault, createdAt",
        searchIndexes: "transcriptionId",
      })
      .upgrade(async (transaction) => {
        const speakerMap = new Map<string, string>();
        let nextSpkId = 1;

        await transaction
          .table("segments")
          .toCollection()
          .modify((segment) => {
            const oldSpeaker = (segment as { speaker?: string }).speaker;
            if (oldSpeaker === undefined) {
              return;
            }

            const transcriptionId = (segment as LocalSegment).transcriptionId;
            const mapKey = `${transcriptionId || "unknown"}::${oldSpeaker}`;

            let spkId = speakerMap.get(mapKey);
            if (!spkId) {
              spkId = String(nextSpkId++);
              speakerMap.set(mapKey, spkId);
            }

            (segment as LocalSegment).speaker_label = oldSpeaker;
            (segment as LocalSegment).spk = spkId;
            delete (segment as { speaker?: string }).speaker;
          });
      });

    this.version(6).stores({
      transcriptions: "id, createdAt, kind, status",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      videoChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
      searchIndexes: "transcriptionId",
    });

    this.version(7).stores({
      transcriptions: "id, createdAt, kind, status, isCloudSynced",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      videoChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
      searchIndexes: "transcriptionId",
    });
  }
}

export const appDb = new AppDatabase();
