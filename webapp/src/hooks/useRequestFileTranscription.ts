import { useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useRtzrApiClient } from "../services/api/rtzrApiClientContext";
import {
  createLocalTranscription,
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
