import { describe, expect, it } from "vitest";
import { createBackendProfile } from "../domain/backendProfile";
import { createFeatureBinding } from "../domain/featureBinding";
import {
  buildBindingInspectorState,
  getBackendHealthTone,
  getBindingResolutionTone,
  resolveSelectedBackendProfile,
} from "./backendBindingOperatorModel";

const summaryPrimary = createBackendProfile({
  id: "summary-primary",
  label: "Summary primary",
  kind: "llm",
  baseUrl: "https://summary.example.com",
  capabilities: ["artifact.summary"],
  enabled: true,
  health: { status: "healthy" },
});

describe("backendBindingOperatorModel", () => {
  it("resolves selected profiles by id", () => {
    expect(resolveSelectedBackendProfile([summaryPrimary], "summary-primary")?.label).toBe(
      "Summary primary"
    );
    expect(resolveSelectedBackendProfile([summaryPrimary], "missing")).toBeNull();
  });

  it("builds a healthy binding inspector with no warnings", () => {
    const binding = createFeatureBinding({
      featureKey: "artifact.summary",
      primaryBackendProfileId: "summary-primary",
      enabled: true,
    });

    const inspector = buildBindingInspectorState({
      bindings: [binding],
      selectedBindingKey: "artifact.summary",
      profiles: [summaryPrimary],
    });

    expect(inspector.resolution?.status).toBe("ready");
    expect(inspector.notices).toEqual([]);
  });

  it("surfaces capability mismatch and missing fallback warnings", () => {
    const binding = createFeatureBinding({
      featureKey: "translate.turn_final",
      primaryBackendProfileId: "summary-primary",
      enabled: true,
    });

    const inspector = buildBindingInspectorState({
      bindings: [binding],
      selectedBindingKey: "translate.turn_final",
      profiles: [summaryPrimary],
    });

    expect(inspector.resolution?.status).toBe("misconfigured");
    expect(inspector.notices.map((notice) => notice.code)).toContain(
      "primary_capability_mismatch"
    );
  });

  it("surfaces fallback activation when the primary is unhealthy and fallback resolves", () => {
    const unhealthyPrimary = createBackendProfile({
      ...summaryPrimary,
      health: { status: "unreachable" },
    });
    const fallback = createBackendProfile({
      id: "summary-fallback",
      label: "Summary fallback",
      kind: "llm",
      baseUrl: "https://fallback.example.com",
      capabilities: ["artifact.summary"],
      enabled: true,
      health: { status: "healthy" },
    });
    const binding = createFeatureBinding({
      featureKey: "artifact.summary",
      primaryBackendProfileId: "summary-primary",
      fallbackBackendProfileId: "summary-fallback",
      enabled: true,
    });

    const inspector = buildBindingInspectorState({
      bindings: [binding],
      selectedBindingKey: "artifact.summary",
      profiles: [unhealthyPrimary, fallback],
    });

    expect(inspector.resolution?.status).toBe("fallback");
    expect(inspector.notices.map((notice) => notice.code)).toContain("fallback_active");
  });

  it("maps health and resolution tones for inspector chips", () => {
    expect(getBackendHealthTone("healthy")).toBe("success");
    expect(getBackendHealthTone("misconfigured")).toBe("error");
    expect(getBindingResolutionTone("fallback")).toBe("warning");
    expect(getBindingResolutionTone("misconfigured")).toBe("error");
  });
});
