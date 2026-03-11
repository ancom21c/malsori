import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createBackendProfile } from "../domain/backendProfile";
import { createFeatureBinding } from "../domain/featureBinding";
import BackendBindingOperatorPanel from "./BackendBindingOperatorPanel";

vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: (key: string, options?: { values?: Record<string, string> }) => {
      if (key === "lastSuccessfulCheckAt") {
        return `lastSuccessfulCheckAt:${options?.values?.time ?? ""}`;
      }
      return key;
    },
    locale: "en",
  }),
}));

describe("BackendBindingOperatorPanel", () => {
  const profiles = [
    createBackendProfile({
      id: "summary-primary",
      label: "Summary primary",
      kind: "llm",
      baseUrl: "https://summary.example.com",
      capabilities: ["artifact.summary"],
      enabled: true,
      health: { status: "healthy" },
    }),
  ];

  const bindings = [
    createFeatureBinding({
      featureKey: "translate.turn_final",
      primaryBackendProfileId: "summary-primary",
      enabled: true,
      retryPolicy: { maxAttempts: 2, backoffMs: 1500 },
    }),
  ];

  it("renders structured inspectors and mismatch notices without opening JSON first", () => {
    render(
      <BackendBindingOperatorPanel
        locale="en"
        disabled={false}
        loading={false}
        error={null}
        lastSuccessAt="2026-03-11T00:00:00.000Z"
        capabilitiesState={{
          capabilityKeys: ["artifact.summary"],
          featureKeys: ["translate.turn_final"],
          compatibility: {
            legacySource: "default",
            endpointState: null,
            legacyProfiles: [],
            legacyBindings: [],
          },
        }}
        profiles={profiles}
        bindings={bindings}
        selectedProfileId="summary-primary"
        selectedBindingKey="translate.turn_final"
        profileEditorValue="{}"
        profileEditorError={null}
        bindingEditorValue="{}"
        bindingEditorError={null}
        onRefresh={() => undefined}
        onNewProfile={() => undefined}
        onSelectProfile={() => undefined}
        onProfileEditorChange={() => undefined}
        onFormatProfileEditor={() => undefined}
        onCopyProfileEditor={() => undefined}
        onSaveProfile={() => undefined}
        onDeleteProfile={() => undefined}
        onNewBinding={() => undefined}
        onSelectBinding={() => undefined}
        onBindingEditorChange={() => undefined}
        onFormatBindingEditor={() => undefined}
        onCopyBindingEditor={() => undefined}
        onSaveBinding={() => undefined}
        onDeleteBinding={() => undefined}
      />
    );

    expect(screen.getAllByText("Summary primary").length).toBeGreaterThan(0);
    expect(screen.getByText("primaryCapabilityMismatchInspectorNotice")).toBeTruthy();
    expect(screen.getByText("resolvedBackend")).toBeTruthy();
    expect(screen.getByText("requiredCapabilities")).toBeTruthy();
  });

  it("keeps advanced JSON editors collapsed until explicitly requested", () => {
    render(
      <BackendBindingOperatorPanel
        locale="en"
        disabled={false}
        loading={false}
        error={null}
        lastSuccessAt={null}
        capabilitiesState={null}
        profiles={profiles}
        bindings={bindings}
        selectedProfileId="summary-primary"
        selectedBindingKey="translate.turn_final"
        profileEditorValue={`{"id":"summary-primary"}`}
        profileEditorError={null}
        bindingEditorValue={`{"featureKey":"translate.turn_final"}`}
        bindingEditorError={null}
        onRefresh={() => undefined}
        onNewProfile={() => undefined}
        onSelectProfile={() => undefined}
        onProfileEditorChange={() => undefined}
        onFormatProfileEditor={() => undefined}
        onCopyProfileEditor={() => undefined}
        onSaveProfile={() => undefined}
        onDeleteProfile={() => undefined}
        onNewBinding={() => undefined}
        onSelectBinding={() => undefined}
        onBindingEditorChange={() => undefined}
        onFormatBindingEditor={() => undefined}
        onCopyBindingEditor={() => undefined}
        onSaveBinding={() => undefined}
        onDeleteBinding={() => undefined}
      />
    );

    expect(screen.queryByText("profileRecordJson")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "viewAdvancedSettings" })[0]);
    expect(screen.getByText("profileRecordJson")).toBeTruthy();
  });
});
