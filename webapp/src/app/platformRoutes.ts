export interface PlatformFeatureFlags {
  modeSplitNavigation: boolean;
  sessionArtifacts: boolean;
  realtimeTranslate: boolean;
}

function isEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const platformFeatureFlags: PlatformFeatureFlags = {
  modeSplitNavigation: isEnabled(import.meta.env.VITE_FEATURE_MODE_SPLIT_NAVIGATION),
  sessionArtifacts: isEnabled(import.meta.env.VITE_FEATURE_SESSION_ARTIFACTS),
  realtimeTranslate: isEnabled(import.meta.env.VITE_FEATURE_REALTIME_TRANSLATE),
};

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
