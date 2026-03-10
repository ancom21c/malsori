import { describe, expect, it } from "vitest";
import {
  findPlatformBackendProfile,
  parseBackendBindingRuntimeConfig,
  resolvePlatformFeatureBinding,
} from "./backendBindingRuntime";

describe("backendBindingRuntime", () => {
  it("normalizes runtime profile and binding payloads", () => {
    const runtime = parseBackendBindingRuntimeConfig(
      JSON.stringify([
        {
          id: "summary-primary",
          label: "Summary",
          kind: "llm",
          base_url: " https://summary.example.com/v1/ ",
          transport: "http",
          auth_strategy: { type: "none" },
          capabilities: ["artifact.summary", "artifact.qa"],
          default_model: "gpt-summary",
          enabled: true,
          health: { status: "healthy" },
        },
      ]),
      JSON.stringify([
        {
          feature_key: "artifact.summary",
          primary_backend_profile_id: "summary-primary",
          enabled: true,
        },
      ])
    );

    expect(runtime.profiles).toHaveLength(1);
    expect(runtime.profiles[0].baseUrl).toBe("https://summary.example.com/v1");
    expect(runtime.bindings).toHaveLength(1);
    expect(resolvePlatformFeatureBinding("artifact.summary", runtime).status).toBe("ready");
  });

  it("falls back to empty runtime on invalid json", () => {
    const runtime = parseBackendBindingRuntimeConfig("{", "}");

    expect(runtime.profiles).toEqual([]);
    expect(runtime.bindings).toEqual([]);
    expect(resolvePlatformFeatureBinding("artifact.summary", runtime).reason).toBe(
      "binding_missing"
    );
  });

  it("finds backend profiles by resolved id", () => {
    const runtime = parseBackendBindingRuntimeConfig(
      JSON.stringify([
        {
          id: "translate-primary",
          label: "Translate",
          kind: "translate",
          base_url: "https://translate.example.com",
          transport: "http",
          auth_strategy: { type: "none" },
          capabilities: ["translate.turn_final"],
          enabled: true,
          health: { status: "healthy" },
        },
      ]),
      "[]"
    );

    expect(findPlatformBackendProfile("translate-primary", runtime)?.label).toBe("Translate");
    expect(findPlatformBackendProfile("missing", runtime)).toBeNull();
  });
});
