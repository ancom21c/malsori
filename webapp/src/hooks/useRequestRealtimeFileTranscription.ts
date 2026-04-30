import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useSettingsStore } from "../store/settingsStore";
import { useI18n } from "../i18n";
import {
  appendAudioChunk,
  createLocalTranscription,
  deleteAudioChunksByRole,
  replaceSegments,
  updateLocalTranscription,
} from "../services/data/transcriptionRepository";
import type { NormalizedRealtimeSegmentPayload } from "../services/api/realtimeStreamingPayload";
import {
  extractModelNameFromConfig,
  resolveBackendEndpointSnapshot,
} from "../utils/transcriptionMetadata";

type RequestPayload = {
  title: string;
  configJson: string;
  file: File;
  presetId?: string | null;
  presetName?: string | null;
};

type PersistableRealtimeSegment = {
  text: string;
  rawText?: string;
  startMs: number;
  endMs: number;
  isFinal: boolean;
  spk?: string;
  speakerLabel?: string;
  language?: string;
  words?: NormalizedRealtimeSegmentPayload["words"];
};

type StreamingClientHandle = {
  connect: (options: Parameters<
    typeof import("../services/api/rtzrStreamingClient").RtzrStreamingClient.prototype.connect
  >[0]) => void;
  disconnect: () => void;
  requestFinal: () => void;
  sendAudioChunk: (
    chunk: ArrayBuffer | ArrayBufferView,
    input?: { durationMs?: number }
  ) => void;
};

export type RealtimeFileUploadStage =
  | "idle"
  | "preparing"
  | "connecting"
  | "streaming"
  | "finalizing"
  | "finished"
  | "error";

export interface RealtimeFileUploadProgress {
  stage: RealtimeFileUploadStage;
  percent: number;
  localId?: string;
  durationMs?: number;
}

const SOURCE_FILE_CHUNK_SIZE = 2 * 1024 * 1024;
const STREAM_CHUNK_MS = 400;
const FINALIZATION_TIMEOUT_MS = 5000;

function toArrayBufferCopy(view: ArrayBufferView): ArrayBuffer {
  const copy = new Uint8Array(view.byteLength);
  copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
  return copy.buffer;
}

async function persistSourceFile(transcriptionId: string, file: File) {
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
    const chunkBuffer = await file.slice(offset, offset + SOURCE_FILE_CHUNK_SIZE).arrayBuffer();
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

function resolveSegmentTiming(segment: NormalizedRealtimeSegmentPayload) {
  const words = segment.words && segment.words.length > 0 ? segment.words : undefined;
  const fallbackStart = words?.[0]?.startMs;
  const fallbackEnd = words?.[words.length - 1]?.endMs;
  const startMs = segment.startMs ?? fallbackStart ?? 0;
  const endMs = segment.endMs ?? fallbackEnd ?? startMs;
  return { startMs, endMs, words };
}

export function useRequestRealtimeFileTranscription() {
  const { enqueueSnackbar } = useSnackbar();
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const activeBackendPresetId = useSettingsStore((state) => state.activeBackendPresetId);
  const defaultSpeakerName = useSettingsStore((state) => state.defaultSpeakerName);
  const { t } = useI18n();
  const clientRef = useRef<StreamingClientHandle | null>(null);
  const cancelRef = useRef(false);
  const cancelHandlerRef = useRef<(() => void) | null>(null);
  const [progress, setProgress] = useState<RealtimeFileUploadProgress>({
    stage: "idle",
    percent: 0,
  });

  const cancel = useCallback(() => {
    cancelRef.current = true;
    if (cancelHandlerRef.current) {
      cancelHandlerRef.current();
    } else {
      clientRef.current?.disconnect();
    }
    setProgress((current) => ({
      ...current,
      stage: current.stage === "idle" ? "idle" : "error",
    }));
  }, []);

  const mutation = useMutation<{ localId: string }, Error, RequestPayload>({
    mutationFn: async (payload) => {
      if (!apiBaseUrl || apiBaseUrl.trim().length === 0) {
        const message = t("pleaseSetThePythonApiBaseUrlFirst");
        enqueueSnackbar(message, { variant: "warning" });
        throw new Error(message);
      }

      let decoderConfig: Record<string, unknown>;
      try {
        decoderConfig = JSON.parse(payload.configJson?.trim() || "{}");
      } catch {
        const message = t("streamingSettingsJsonIsInvalid");
        enqueueSnackbar(message, { variant: "error" });
        throw new Error(message);
      }

      cancelRef.current = false;
      setProgress({ stage: "preparing", percent: 0 });

      const [
        { RtzrStreamingClient },
        { classifyRealtimeStreamingPayload },
        { decodeAudioFileToPcm, extractSampleRateFromAudioConfig },
      ] = await Promise.all([
        import("../services/api/rtzrStreamingClient"),
        import("../services/api/realtimeStreamingPayload"),
        import("../services/audio/decodeAudioFile"),
      ]);

      if (cancelRef.current) {
        throw new Error(t("theSessionHasBeenAborted"));
      }

      const backendSnapshot = await resolveBackendEndpointSnapshot(activeBackendPresetId);
      const initialSampleRate = extractSampleRateFromAudioConfig(decoderConfig);
      const modelName = extractModelNameFromConfig(decoderConfig);
      const localRecord = await createLocalTranscription({
        title: payload.title || payload.file.name,
        kind: "file",
        status: "processing",
        metadata: {
          processingStage: "connecting",
          sttTransport: "streaming",
          captureInput: "uploaded_file",
          configSnapshotJson: JSON.stringify(decoderConfig),
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
      setProgress({ stage: "preparing", percent: 0, localId: localRecord.id });

      try {
        const audioData = await decodeAudioFileToPcm(payload.file, initialSampleRate);
        if (cancelRef.current) {
          throw new Error(t("theSessionHasBeenAborted"));
        }
        decoderConfig = { ...decoderConfig, sample_rate: audioData.sampleRate };
        await updateLocalTranscription(localRecord.id, {
          configSnapshotJson: JSON.stringify(decoderConfig),
          audioSampleRate: audioData.sampleRate,
          audioChannels: 1,
          durationMs: audioData.durationMs,
        });
        try {
          await persistSourceFile(localRecord.id, payload.file);
        } catch (error) {
          await deleteAudioChunksByRole(localRecord.id, "source_file");
          await updateLocalTranscription(localRecord.id, {
            sourceFileStorageState: "failed",
            sourceFileChunkCount: 0,
            sourceFileStoredBytes: 0,
          });
          console.warn("Failed to persist source file for realtime upload retry.", error);
        }
        if (cancelRef.current) {
          throw new Error(t("theSessionHasBeenAborted"));
        }
        setProgress({
          stage: "connecting",
          percent: 0,
          localId: localRecord.id,
          durationMs: audioData.durationMs,
        });

        const segments: PersistableRealtimeSegment[] = [];

        await new Promise<void>((resolve, reject) => {
          let settled = false;
          let finalizationTimer: number | undefined;

          const settle = (callback: () => void) => {
            if (settled) {
              return;
            }
            settled = true;
            if (finalizationTimer) {
              window.clearTimeout(finalizationTimer);
            }
            cancelHandlerRef.current = null;
            clientRef.current?.disconnect();
            clientRef.current = null;
            callback();
          };

          const fail = (error: Error) => {
            settle(() => reject(error));
          };
          cancelHandlerRef.current = () => {
            fail(new Error(t("theSessionHasBeenAborted")));
          };

          const client = new RtzrStreamingClient();
          clientRef.current = client;

          const sendPcmData = async () => {
            const sampleRate = audioData.sampleRate || initialSampleRate;
            const chunkSize = Math.max(1, Math.round((sampleRate * STREAM_CHUNK_MS) / 1000));
            let sent = 0;
            let chunkIndex = 0;

            await updateLocalTranscription(localRecord.id, {
              processingStage: "recording",
            });
            setProgress({
              stage: "streaming",
              percent: 0,
              localId: localRecord.id,
              durationMs: audioData.durationMs,
            });

            for (let offset = 0; offset < audioData.pcm.length; offset += chunkSize) {
              if (cancelRef.current) {
                fail(new Error(t("theSessionHasBeenAborted")));
                return;
              }
              const chunk = audioData.pcm.subarray(
                offset,
                Math.min(offset + chunkSize, audioData.pcm.length)
              ).slice();
              const chunkBuffer = toArrayBufferCopy(chunk);
              const durationMs = Math.round((chunk.length / sampleRate) * 1000);
              await appendAudioChunk({
                transcriptionId: localRecord.id,
                chunkIndex,
                data: chunkBuffer.slice(0),
                mimeType: `audio/pcm;rate=${sampleRate}`,
                role: "capture",
              });
              client.sendAudioChunk(chunkBuffer, { durationMs });
              sent += chunk.length;
              chunkIndex += 1;
              setProgress({
                stage: "streaming",
                percent: Math.min(99, Math.round((sent / audioData.pcm.length) * 100)),
                localId: localRecord.id,
                durationMs: audioData.durationMs,
              });
            }

            await updateLocalTranscription(localRecord.id, {
              processingStage: "finalizing",
            });
            setProgress({
              stage: "finalizing",
              percent: 100,
              localId: localRecord.id,
              durationMs: audioData.durationMs,
            });
            client.requestFinal();
            if (!settled) {
              finalizationTimer = window.setTimeout(() => {
                if (cancelRef.current) {
                  fail(new Error(t("theSessionHasBeenAborted")));
                  return;
                }
                settle(resolve);
              }, FINALIZATION_TIMEOUT_MS);
            }
          };

          client.connect({
            baseUrl: apiBaseUrl,
            decoderConfig,
            metadata: {
              transcription_id: localRecord.id,
              filename: payload.file.name,
              file_size: payload.file.size,
              duration_ms: audioData.durationMs,
              upload_transport: "streaming",
            },
            reconnectAttempts: 0,
            onMessage: (event) => {
              const classified = classifyRealtimeStreamingPayload(event.data);
              if (classified.kind === "error") {
                fail(new Error(classified.message ?? t("anErrorOccurredDuringStreaming")));
                return;
              }
              if (classified.kind === "final") {
                const segment = classified.segment;
                if (!segment.text.trim()) {
                  return;
                }
                const { startMs, endMs, words } = resolveSegmentTiming(segment);
                let speakerLabel = segment.speakerLabel;
                if (segment.spk === "0" && !speakerLabel) {
                  speakerLabel = defaultSpeakerName;
                }
                segments.push({
                  text: segment.text,
                  rawText: segment.rawText,
                  startMs,
                  endMs,
                  isFinal: true,
                  spk: segment.spk,
                  speakerLabel,
                  language: segment.language,
                  words,
                });
              }
            },
            onOpen: () => {
              void sendPcmData().catch((error) => {
                fail(error instanceof Error ? error : new Error(t("anErrorOccurredDuringStreaming")));
              });
            },
            onError: (event) => {
              if (cancelRef.current) {
                fail(new Error(t("theSessionHasBeenAborted")));
                return;
              }
              console.error("Realtime file upload streaming error", event);
            },
            onClose: () => {
              if (cancelRef.current) {
                fail(new Error(t("theSessionHasBeenAborted")));
                return;
              }
              settle(resolve);
            },
            onPermanentFailure: (event) => {
              if (cancelRef.current) {
                fail(new Error(t("theSessionHasBeenAborted")));
                return;
              }
              console.error("Realtime file upload fatal streaming error", event);
              fail(new Error(t("aFatalErrorOccurredInYourStreamingSession")));
            },
          });
        });

        if (cancelRef.current) {
          throw new Error(t("theSessionHasBeenAborted"));
        }
        if (segments.length === 0) {
          throw new Error(t("noRealtimeTranscriptionResultsReturned"));
        }

        await replaceSegments(
          localRecord.id,
          segments.map((segment) => ({
            text: segment.text,
            rawText: segment.rawText,
            startMs: segment.startMs,
            endMs: segment.endMs,
            isFinal: true,
            spk: segment.spk,
            speaker_label: segment.speakerLabel,
            language: segment.language,
            words: segment.words,
          }))
        );
        const transcriptText = segments.map((segment) => segment.text).join("\n");
        await updateLocalTranscription(localRecord.id, {
          status: "completed",
          processingStage: undefined,
          transcriptText,
          durationMs: audioData.durationMs,
          errorMessage: undefined,
        });
        setProgress({
          stage: "finished",
          percent: 100,
          localId: localRecord.id,
          durationMs: audioData.durationMs,
        });
        enqueueSnackbar(t("realTimeTranscriptionResultsAreSaved"), { variant: "success" });
        return { localId: localRecord.id };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("anErrorOccurredDuringStreaming");
        await updateLocalTranscription(localRecord.id, {
          status: "failed",
          processingStage: undefined,
          errorMessage: message,
        });
        setProgress((current) => ({
          ...current,
          stage: "error",
          localId: localRecord.id,
        }));
        enqueueSnackbar(message, { variant: "error" });
        throw error instanceof Error ? error : new Error(message);
      }
    },
  });

  const reset = useCallback(() => {
    mutation.reset();
    cancelRef.current = false;
    cancelHandlerRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    setProgress({ stage: "idle", percent: 0 });
  }, [mutation]);

  return {
    ...mutation,
    progress,
    cancel,
    reset,
  };
}
