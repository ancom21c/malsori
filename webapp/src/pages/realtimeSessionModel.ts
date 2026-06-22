import { DEFAULT_STREAMING_TEMPLATE_CONFIG_JSON } from "../data/defaultPresets";
import { buildSessionDetailPath } from "../app/platformRoutes";

export type RealtimeSessionState =
  | "idle"
  | "countdown"
  | "connecting"
  | "recording"
  | "paused"
  | "stopping"
  | "saving";

export type RealtimeInputSource = "microphone" | "uploaded_file";

export type RealtimeRecorderLifecycleState =
  | "idle"
  | "preparing"
  | "recording"
  | "stopped"
  | "error";

interface ResolveRealtimeStreamingConfigStringOptions {
  draftJson?: string | null;
  activePresetConfigJson?: string | null;
  defaultPresetConfigJson?: string | null;
  fallbackConfigJson?: string | null;
}

export function resolveRealtimeStreamingConfigString({
  draftJson,
  activePresetConfigJson,
  defaultPresetConfigJson,
  fallbackConfigJson,
}: ResolveRealtimeStreamingConfigStringOptions): string {
  const trimmedDraft = draftJson?.trim() ?? "";
  if (trimmedDraft.length > 0) {
    return draftJson ?? trimmedDraft;
  }

  return (
    activePresetConfigJson ??
    defaultPresetConfigJson ??
    fallbackConfigJson ??
    DEFAULT_STREAMING_TEMPLATE_CONFIG_JSON
  );
}

export function buildTranscriptionDetailPath(id: string): string {
  return buildSessionDetailPath(id);
}

export function shouldKeepCaptureAliveDuringBackgroundRecovery(input: {
  inputSource: RealtimeInputSource;
  sessionWasBackgrounded: boolean;
  countdownFinished: boolean;
  recorderState: RealtimeRecorderLifecycleState | null;
  sessionState: RealtimeSessionState;
}) {
  return (
    input.inputSource === "microphone" &&
    input.sessionWasBackgrounded &&
    input.countdownFinished &&
    input.recorderState === "recording" &&
    input.sessionState !== "idle" &&
    input.sessionState !== "saving" &&
    input.sessionState !== "stopping"
  );
}
