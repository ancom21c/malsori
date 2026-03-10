import { describe, expect, it } from "vitest";
import {
  normalizeBackendProfileRecord,
  normalizeFeatureBindingRecord,
} from "./backendBindingContracts";

describe("normalizeBackendProfileRecord", () => {
  it("maps snake_case internal API payloads into backend profile records", () => {
    const normalized = normalizeBackendProfileRecord({
      id: "summary-primary",
      label: "Summary Primary",
      kind: "llm",
      base_url: "https://llm.example.com",
      transport: "http",
      auth_strategy: {
        type: "bearer_secret_ref",
        credential_ref: {
          kind: "kubernetes_secret",
          id: "summary-secret",
          field: "token",
        },
      },
      capabilities: ["artifact.summary", "artifact.qa"],
      default_model: "gpt-summary",
      enabled: true,
      metadata: {
        tier: "prod",
      },
      health: {
        status: "healthy",
        checked_at: "2026-03-10T00:00:00.000Z",
      },
    });

    expect(normalized).toMatchObject({
      id: "summary-primary",
      kind: "llm",
      baseUrl: "https://llm.example.com",
      authStrategy: {
        type: "bearer_secret_ref",
        credentialRef: {
          kind: "kubernetes_secret",
          id: "summary-secret",
          field: "token",
        },
      },
      defaultModel: "gpt-summary",
      metadata: {
        tier: "prod",
      },
      health: {
        status: "healthy",
        checkedAt: "2026-03-10T00:00:00.000Z",
      },
    });
  });
});

describe("normalizeFeatureBindingRecord", () => {
  it("maps snake_case binding payloads into frontend feature bindings", () => {
    const normalized = normalizeFeatureBindingRecord({
      feature_key: "translate.turn_final",
      primary_backend_profile_id: "translate-primary",
      fallback_backend_profile_id: "translate-fallback",
      enabled: true,
      model_override: "final-v2",
      timeout_ms: 4000,
      retry_policy: {
        max_attempts: 2,
        backoff_ms: 500,
      },
      degraded_behavior: "source_only",
    });

    expect(normalized).toMatchObject({
      featureKey: "translate.turn_final",
      primaryBackendProfileId: "translate-primary",
      fallbackBackendProfileId: "translate-fallback",
      modelOverride: "final-v2",
      timeoutMs: 4000,
      retryPolicy: {
        maxAttempts: 2,
        backoffMs: 500,
      },
      degradedBehavior: "source_only",
    });
  });
});
