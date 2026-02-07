import { useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useRtzrApiClient } from "../services/api/rtzrApiClientContext";
import {
  appendAudioChunk,
  createLocalTranscription,
  deleteAudioChunksByRole,
  updateLocalTranscription,
} from "../services/data/transcriptionRepository";
import { useSettingsStore } from "../store/settingsStore";
import {
  extractModelNameFromConfigJson,
  resolveBackendEndpointSnapshot,
} from "../utils/transcriptionMetadata";
import { useI18n } from "../i18n";

type RequestPayload = {
  title: string;
  configJson: string;
  file: File;
  presetId?: string | null;
  presetName?: string | null;
};

const SOURCE_FILE_CHUNK_SIZE = 2 * 1024 * 1024;

export function useRequestFileTranscription() {
  const apiClient = useRtzrApiClient();
  const { enqueueSnackbar } = useSnackbar();
  const activeBackendPresetId = useSettingsStore((state) => state.activeBackendPresetId);
  const { t } = useI18n();

  return useMutation<{ localId: string; remoteId: string }, Error, RequestPayload>({
    mutationFn: async (payload: RequestPayload) => {
      const backendSnapshot = await resolveBackendEndpointSnapshot(activeBackendPresetId);
      const modelName = extractModelNameFromConfigJson(payload.configJson);
      const localRecord = await createLocalTranscription({
        title: payload.title || payload.file.name,
        kind: "file",
        status: "processing",
        metadata: {
          configSnapshotJson: payload.configJson,
          sourceFileName: payload.file.name,
          sourceFileMimeType: payload.file.type || "application/octet-stream",
          sourceFileSize: payload.file.size,
          configPresetId: payload.presetId ?? undefined,
          configPresetName: payload.presetName ?? undefined,
          modelName,
          backendEndpointId: backendSnapshot.id,
          backendEndpointName: backendSnapshot.name,
          backendEndpointSource: backendSnapshot.source,
          backendDeployment: backendSnapshot.deployment,
          backendApiBaseUrl: backendSnapshot.apiBaseUrl,
        },
      });

      try {
        try {
          await deleteAudioChunksByRole(localRecord.id, "source_file");
          await updateLocalTranscription(localRecord.id, {
            sourceFileStorageState: "pending",
            sourceFileChunkCount: 0,
            sourceFileStoredBytes: 0,
          });

          const totalSize = payload.file.size;
          let chunkIndex = 0;
          let storedBytes = 0;
          for (let offset = 0; offset < totalSize; offset += SOURCE_FILE_CHUNK_SIZE) {
            const chunkBuffer = await payload.file
              .slice(offset, offset + SOURCE_FILE_CHUNK_SIZE)
              .arrayBuffer();
            await appendAudioChunk({
              transcriptionId: localRecord.id,
              chunkIndex,
              data: chunkBuffer,
              mimeType: payload.file.type || "application/octet-stream",
              role: "source_file",
            });
            storedBytes += chunkBuffer.byteLength;
            chunkIndex += 1;
          }
          const sourceStorageReady = storedBytes === totalSize;
          if (!sourceStorageReady) {
            await deleteAudioChunksByRole(localRecord.id, "source_file");
          }
          await updateLocalTranscription(localRecord.id, {
            sourceFileStorageState: sourceStorageReady ? "ready" : "failed",
            sourceFileChunkCount: sourceStorageReady ? chunkIndex : 0,
            sourceFileStoredBytes: sourceStorageReady ? storedBytes : 0,
          });
        } catch (error) {
          await deleteAudioChunksByRole(localRecord.id, "source_file");
          await updateLocalTranscription(localRecord.id, {
            sourceFileStorageState: "failed",
            sourceFileChunkCount: 0,
            sourceFileStoredBytes: 0,
          });
          console.warn("Failed to persist source file for retry.", error);
        }

        const response = await apiClient.requestFileTranscription({
          title: payload.title,
          configJson: payload.configJson,
          file: payload.file,
        });

        await updateLocalTranscription(localRecord.id, {
          remoteId: response.transcribeId,
          status:
            response.status === "completed" ? "completed" : "processing",
          errorMessage: undefined,
        });

        enqueueSnackbar(t("yourTranscriptionRequestHasBeenSent"), { variant: "success" });
        return {
          localId: localRecord.id,
          remoteId: response.transcribeId,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("anErrorOccurredDuringTheTranscriptionRequest");
        await updateLocalTranscription(localRecord.id, {
          status: "failed",
          errorMessage: message,
        });
        enqueueSnackbar(message, { variant: "error" });
        throw error;
      }
    },
  });
}
