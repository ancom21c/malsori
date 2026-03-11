import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BackendRuntimeChangeDialog from "./BackendRuntimeChangeDialog";

vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: (key: string, options?: { values?: Record<string, string> }) => {
      if (key === "reviewBackendApplyChangeHelper") {
        return `reviewBackendApplyChangeHelper:${options?.values?.name ?? ""}`;
      }
      return key;
    },
    locale: "en",
  }),
}));

describe("BackendRuntimeChangeDialog", () => {
  it("renders current and next runtime snapshots before apply", () => {
    const handleConfirm = vi.fn();

    render(
      <BackendRuntimeChangeDialog
        open
        action="apply"
        pending={false}
        presetName="Ops RTZR"
        currentSnapshot={{
          source: "default",
          deployment: "cloud",
          apiBaseUrl: "https://current.example.com",
          verifySsl: true,
          usesClientCredentials: false,
        }}
        nextSnapshot={{
          source: "override",
          deployment: "onprem",
          apiBaseUrl: "https://next.example.com",
          verifySsl: false,
          usesClientCredentials: true,
        }}
        onCancel={() => undefined}
        onConfirm={handleConfirm}
      />
    );

    expect(screen.getByText("reviewBackendApplyChange")).toBeTruthy();
    expect(screen.getByText("reviewBackendApplyChangeHelper:Ops RTZR")).toBeTruthy();
    expect(screen.getByText("currentServerState")).toBeTruthy();
    expect(screen.getByText("nextServerState")).toBeTruthy();
    expect(screen.getByText("https://current.example.com")).toBeTruthy();
    expect(screen.getByText("https://next.example.com")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "applyToServer" }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows inline retry context when a reset fails", () => {
    render(
      <BackendRuntimeChangeDialog
        open
        action="reset"
        pending={false}
        currentSnapshot={{
          source: "override",
          deployment: "cloud",
          apiBaseUrl: "https://override.example.com",
          verifySsl: true,
          usesClientCredentials: true,
        }}
        nextSnapshot={{
          source: "default",
          deployment: null,
          apiBaseUrl: null,
          verifySsl: null,
          usesClientCredentials: null,
        }}
        errorText="reset failed"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(screen.getByText("reviewServerDefaultRestore")).toBeTruthy();
    expect(screen.getAllByText("resolvedByServerDefault").length).toBeGreaterThan(0);
    expect(screen.getByText("reset failed")).toBeTruthy();
  });
});
