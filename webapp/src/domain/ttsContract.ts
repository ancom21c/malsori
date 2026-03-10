import type { BackendProfile } from "./backendProfile";
import type { FeatureBinding, FeatureResolutionResult } from "./featureBinding";
import { resolveFeatureBinding } from "./featureBinding";

export type TtsFeatureKey = "tts.speak" | "tts.stream";
export type TtsOutputFormat =
  | "audio_url"
  | "audio_blob"
  | "pcm_base64"
  | "pcm_chunks"
  | "media_stream";
export type TtsPlaybackState = "idle" | "pending" | "ready" | "failed";

export interface TtsSynthesisRequest {
  sessionId?: string;
  text: string;
  voice?: string;
  language?: string;
  featureKey: TtsFeatureKey;
}

export interface TtsSynthesisChunk {
  sequence: number;
  format: Exclude<TtsOutputFormat, "audio_url" | "audio_blob">;
  payload: string;
  durationMs?: number;
}

export interface TtsSynthesisResult {
  featureKey: TtsFeatureKey;
  state: TtsPlaybackState;
  format: TtsOutputFormat;
  backendProfileId?: string | null;
  mediaUrl?: string | null;
  chunks?: TtsSynthesisChunk[];
  errorMessage?: string | null;
}

export interface TtsBindingPresentation {
  featureKey: TtsFeatureKey;
  resolution: FeatureResolutionResult;
  ready: boolean;
}

export function buildTtsBindingPresentation(
  featureKey: TtsFeatureKey,
  bindings: readonly FeatureBinding[],
  profiles: readonly BackendProfile[]
): TtsBindingPresentation {
  const resolution = resolveFeatureBinding(featureKey, bindings, profiles);

  return {
    featureKey,
    resolution,
    ready: resolution.status === "ready" || resolution.status === "fallback",
  };
}

export function createFailedTtsResult(
  featureKey: TtsFeatureKey,
  errorMessage: string,
  backendProfileId?: string | null
): TtsSynthesisResult {
  return {
    featureKey,
    state: "failed",
    format: featureKey === "tts.stream" ? "pcm_chunks" : "audio_url",
    backendProfileId: backendProfileId ?? null,
    errorMessage,
  };
}
