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

export type RequestFileTranscriptionPayload = {
  title: string;
  configJson: string;
  file: File;
  presetId?: string | null;
  presetName?: string | null;
  suppressNotifications?: boolean;
};

export type RequestFileTranscriptionResult = {
  localId: string;
  remoteId: string;
};

type ApiClient = ReturnType<typeof useRtzrApiClient>;
type Snackbar = ReturnType<typeof useSnackbar>["enqueueSnackbar"];
type Translate = ReturnType<typeof useI18n>["t"];

type RequestContext = {
  activeBackendPresetId: string | null;
  apiClient: ApiClient;
  enqueueSnackbar: Snackbar;
  t: Translate;
};

type RequestOptions = {
  notifySuccess?: boolean;
  notifyError?: boolean;
};

const SOURCE_FILE_CHUNK_SIZE = 2 * 1024 * 1024;

function resolveUnknownUpstreamStatusMessage(
  rawStatus: string | undefined,
  t: Translate
) {
  return t("unknownUpstreamStatusReceived", {
    values: { status: rawStatus ?? "unknown" },
  });
}

async function persistSourceFileForRetry(transcriptionId: string, file: File) {
  await deleteAudioChunksByRole(transcriptionId, "source_file");
  await updateLocalTranscription(transcriptionId, {
    sourceFileStorageState: "pending",
    sourceFileChunkCount: 0,
    sourceFileStoredBytes: 0,
  });

  const totalSize = file.size;
  let chunkIndex = 0;
  let storedBytes = 0;
  for (let offset = 0; offset < totalSize; offset += SOURCE_FILE_CHUNK_SIZE) {
    const chunkBuffer = await file
      .slice(offset, offset + SOURCE_FILE_CHUNK_SIZE)
      .arrayBuffer();
    await appendAudioChunk({
      transcriptionId,
      chunkIndex,
      data: chunkBuffer,
      mimeType: file.type || "application/octet-stream",
      role: "source_file",
    });
    storedBytes += chunkBuffer.byteLength;
    chunkIndex += 1;
  }
  const sourceStorageReady = storedBytes === totalSize;
  if (!sourceStorageReady) {
    await deleteAudioChunksByRole(transcriptionId, "source_file");
  }
  await updateLocalTranscription(transcriptionId, {
    sourceFileStorageState: sourceStorageReady ? "ready" : "failed",
    sourceFileChunkCount: sourceStorageReady ? chunkIndex : 0,
    sourceFileStoredBytes: sourceStorageReady ? storedBytes : 0,
  });
}

async function requestFileTranscriptionJob(
  payload: RequestFileTranscriptionPayload,
  context: RequestContext,
  options?: RequestOptions
): Promise<RequestFileTranscriptionResult> {
  const notifySuccess = options?.notifySuccess ?? true;
  const notifyError = options?.notifyError ?? true;
  const { activeBackendPresetId, apiClient, enqueueSnackbar, t } = context;
  const backendSnapshot = await resolveBackendEndpointSnapshot(activeBackendPresetId);
  const modelName = extractModelNameFromConfigJson(payload.configJson);
  const localRecord = await createLocalTranscription({
    title: payload.title || payload.file.name,
    kind: "file",
    status: "processing",
    metadata: {
      sttTransport: "batch",
      captureInput: "uploaded_file",
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
      await persistSourceFileForRetry(localRecord.id, payload.file);
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

    if (response.status === "failed") {
      const message =
        response.statusReason === "unknown_upstream_status"
          ? resolveUnknownUpstreamStatusMessage(response.rawStatus, t)
          : t("transcriptionRequestFailedTryAgain");
      await updateLocalTranscription(localRecord.id, {
        remoteId: response.transcribeId,
        status: "failed",
        upstreamStatusRaw: response.rawStatus,
        upstreamStatusReason: response.statusReason,
        errorMessage: message,
      });
      if (notifyError) {
        enqueueSnackbar(message, { variant: "error" });
      }
      throw new Error(message);
    }

    await updateLocalTranscription(localRecord.id, {
      remoteId: response.transcribeId,
      status: response.status === "completed" ? "completed" : "processing",
      upstreamStatusRaw: response.rawStatus,
      upstreamStatusReason: response.statusReason,
      errorMessage: undefined,
    });

    if (notifySuccess) {
      enqueueSnackbar(t("yourTranscriptionRequestHasBeenSent"), { variant: "success" });
    }
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
    if (notifyError) {
      enqueueSnackbar(message, { variant: "error" });
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

export function useRequestFileTranscription() {
  const apiClient = useRtzrApiClient();
  const { enqueueSnackbar } = useSnackbar();
  const activeBackendPresetId = useSettingsStore((state) => state.activeBackendPresetId);
  const { t } = useI18n();

  return useMutation<
    RequestFileTranscriptionResult,
    Error,
    RequestFileTranscriptionPayload
  >({
    mutationFn: async (payload: RequestFileTranscriptionPayload) =>
      requestFileTranscriptionJob(
        payload,
        {
          activeBackendPresetId,
          apiClient,
          enqueueSnackbar,
          t,
        },
        {
          notifySuccess: !payload.suppressNotifications,
          notifyError: !payload.suppressNotifications,
        }
      ),
  });
}
