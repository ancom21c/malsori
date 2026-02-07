import { useEffect } from "react";
import { useRtzrApiClient } from "../services/api/rtzrApiClientContext";
import { useSettingsStore } from "../store/settingsStore";
import { appDb } from "../data/app-db";
import {
  updateLocalTranscription,
  replaceSegments,
} from "../services/data/transcriptionRepository";
import { useI18n } from "../i18n";

function coerceMilliseconds(value: number | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  return undefined;
}

const IDLE_POLL_INTERVAL_MS = 15000;
const ACTIVE_POLL_INTERVAL_MS = 5000;

export function useTranscriptionSync() {
  const apiClient = useRtzrApiClient();
  const hydrated = useSettingsStore((state) => state.hydrated);
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const { t } = useI18n();

  useEffect(() => {
    if (!hydrated || apiBaseUrl.trim().length === 0) {
      return;
    }

    let stopped = false;
    let timer: number | undefined;

    const scheduleNext = (delay: number) => {
      if (!stopped) {
        timer = window.setTimeout(poll, delay);
      }
    };

    const poll = async () => {
      let pendingCount = 0;
      try {
        const pending = await appDb.transcriptions
          .filter(
            (item) =>
              Boolean(item.remoteId) &&
              item.status !== "completed" &&
              item.status !== "failed"
          )
          .toArray();
        pendingCount = pending.length;

        for (const item of pending) {
          if (!item.remoteId) continue;
          try {
            const result = await apiClient.getFileTranscriptionStatus(item.remoteId);
            const status =
              result.status === "completed"
                ? "completed"
                : result.status === "failed"
                ? "failed"
                : "processing";
            const isTerminalStatus = status === "completed" || status === "failed";
            await updateLocalTranscription(item.id, {
              status,
              transcriptText: result.text,
              remoteAudioUrl: result.audioUrl ?? item.remoteAudioUrl,
              errorMessage:
                result.status === "failed"
                  ? result.error ?? t("warriorFailure")
                  : undefined,
            });
            const hasSegmentsPayload = Array.isArray(result.segments);
            const shouldReplaceSegments =
              hasSegmentsPayload &&
              ((result.segments?.length ?? 0) > 0 || isTerminalStatus);
            if (shouldReplaceSegments && result.segments) {
              await replaceSegments(
                item.id,
                result.segments.map((segment) => ({
                  spk:
                    segment.spk?.trim() ||
                    (segment.speaker && /^\d+$/.test(segment.speaker.trim())
                      ? segment.speaker.trim()
                      : undefined),
                  speaker_label:
                    segment.speakerLabel?.trim() ||
                    (segment.speaker && !/^\d+$/.test(segment.speaker.trim())
                      ? segment.speaker.trim()
                      : undefined),
                  language: segment.language,
                  startMs: coerceMilliseconds(segment.startMs),
                  endMs: coerceMilliseconds(segment.endMs),
                  text: segment.text,
                  isFinal: isTerminalStatus,
                  isPartial: result.status === "transcribing" || result.status === "processing",
                  words:
                    segment.words && segment.words.length > 0
                      ? segment.words.map((word) => ({
                          text: word.text,
                          startMs: coerceMilliseconds(word.startMs),
                          endMs:
                            coerceMilliseconds(word.endMs) ??
                            (typeof word.startMs === "number" && typeof word.durationMs === "number"
                              ? Math.round(word.startMs + word.durationMs)
                              : undefined),
                          confidence: word.confidence,
                        }))
                      : undefined,
                })),
                { preserveCorrections: true }
              );
            }
          } catch (error) {
            console.error(t("transcriptionStateSynchronizationFailure"), error);
          }
        }
      } finally {
        const delay =
          pendingCount > 0 ? ACTIVE_POLL_INTERVAL_MS : IDLE_POLL_INTERVAL_MS;
        scheduleNext(delay);
      }
    };

    void poll();

    return () => {
      stopped = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [hydrated, apiBaseUrl, apiClient, t]);
}
