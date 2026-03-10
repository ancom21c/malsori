import { DEFAULT_STREAMING_TEMPLATE_CONFIG_JSON } from "../data/defaultPresets";
import { buildSessionDetailPath } from "../app/platformRoutes";

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
