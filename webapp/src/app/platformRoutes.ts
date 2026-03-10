export interface PlatformFeatureFlags {
  modeSplitNavigation: boolean;
  sessionArtifacts: boolean;
  realtimeTranslate: boolean;
}

function resolveFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const platformFeatureFlags: PlatformFeatureFlags = {
  modeSplitNavigation: resolveFlag(
    import.meta.env.VITE_FEATURE_MODE_SPLIT_NAVIGATION,
    true
  ),
  sessionArtifacts: resolveFlag(
    import.meta.env.VITE_FEATURE_SESSION_ARTIFACTS,
    false
  ),
  realtimeTranslate: resolveFlag(
    import.meta.env.VITE_FEATURE_REALTIME_TRANSLATE,
    false
  ),
};

export function resolveCaptureHubPath(
  flags: PlatformFeatureFlags = platformFeatureFlags
): string {
  return flags.modeSplitNavigation ? "/capture" : resolveRealtimeCapturePath(flags);
}

export function resolveSessionsPath(
  flags: PlatformFeatureFlags = platformFeatureFlags
): string {
  return flags.modeSplitNavigation ? "/sessions" : "/";
}

export function resolveRealtimeCapturePath(
  flags: PlatformFeatureFlags = platformFeatureFlags
): string {
  return flags.modeSplitNavigation ? "/capture/realtime" : "/realtime";
}

export function resolveFileCapturePath(
  flags: PlatformFeatureFlags = platformFeatureFlags
): string {
  return flags.modeSplitNavigation ? "/capture/file" : "/";
}

export function buildSessionDetailPath(
  id: string,
  flags: PlatformFeatureFlags = platformFeatureFlags
): string {
  return flags.modeSplitNavigation ? `/sessions/${id}` : `/transcriptions/${id}`;
}

export function resolveTranslatePath(
  flags: PlatformFeatureFlags = platformFeatureFlags
): string {
  return flags.realtimeTranslate ? "/translate" : resolveRealtimeCapturePath(flags);
}

export function getCoreExperiencePaths(
  flags: PlatformFeatureFlags = platformFeatureFlags
) {
  return {
    sessions: resolveSessionsPath(flags),
    realtimeCapture: resolveRealtimeCapturePath(flags),
    settings: "/settings",
    detailPrefix: flags.modeSplitNavigation ? "/sessions/" : "/transcriptions/",
  };
}
