import { describe, expect, it } from "vitest";
import {
  buildSessionDetailPath,
  getCoreExperiencePaths,
  resolveCaptureHubPath,
  resolveFileCapturePath,
  resolveRealtimeCapturePath,
  resolveSessionsPath,
  resolveTranslatePath,
  type PlatformFeatureFlags,
} from "./platformRoutes";

const legacyFlags: PlatformFeatureFlags = {
  modeSplitNavigation: false,
  sessionArtifacts: false,
  realtimeTranslate: false,
};

const expandedFlags: PlatformFeatureFlags = {
  modeSplitNavigation: true,
  sessionArtifacts: true,
  realtimeTranslate: true,
};

describe("platform route preservation baseline", () => {
  it("keeps the current STT-first route contract when expansion flags are disabled", () => {
    expect(resolveSessionsPath(legacyFlags)).toBe("/");
    expect(resolveCaptureHubPath(legacyFlags)).toBe("/realtime");
    expect(resolveRealtimeCapturePath(legacyFlags)).toBe("/realtime");
    expect(resolveFileCapturePath(legacyFlags)).toBe("/");
    expect(buildSessionDetailPath("abc-123", legacyFlags)).toBe("/transcriptions/abc-123");
    expect(resolveTranslatePath(legacyFlags)).toBe("/realtime");
    expect(getCoreExperiencePaths(legacyFlags)).toEqual({
      sessions: "/",
      realtimeCapture: "/realtime",
      settings: "/settings",
      detailPrefix: "/transcriptions/",
    });
  });

  it("can resolve additive IA routes without dropping compatibility helpers", () => {
    expect(resolveSessionsPath(expandedFlags)).toBe("/sessions");
    expect(resolveCaptureHubPath(expandedFlags)).toBe("/capture");
    expect(resolveRealtimeCapturePath(expandedFlags)).toBe("/capture/realtime");
    expect(resolveFileCapturePath(expandedFlags)).toBe("/capture/file");
    expect(buildSessionDetailPath("xyz", expandedFlags)).toBe("/sessions/xyz");
    expect(resolveTranslatePath(expandedFlags)).toBe("/translate");
    expect(getCoreExperiencePaths(expandedFlags)).toEqual({
      sessions: "/sessions",
      realtimeCapture: "/capture/realtime",
      settings: "/settings",
      detailPrefix: "/sessions/",
    });
  });
});
