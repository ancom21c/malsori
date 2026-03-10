import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import AppRouter from "./AppRouter";

vi.mock("../layouts/MainLayout", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

vi.mock("../pages/TranscriptionListPage", () => ({
  default: () => <div>TranscriptionListPageMock</div>,
}));

vi.mock("../pages/TranscriptionDetailPage", () => ({
  default: () => <div>TranscriptionDetailPageMock</div>,
}));

vi.mock("../pages/SettingsPage", () => ({
  default: () => <div>SettingsPageMock</div>,
}));

vi.mock("../pages/RealtimeSessionPage", () => ({
  default: () => <div>RealtimeSessionPageMock</div>,
}));

vi.mock("../pages/TranslatePage", () => ({
  default: () => <div>TranslatePageMock</div>,
}));

vi.mock("../pages/HelpPage", () => ({
  default: () => <div>HelpPageMock</div>,
}));

vi.mock("../pages/LabPage", () => ({
  default: () => <div>LabPageMock</div>,
}));

vi.mock("../pages/UiConceptsPage", () => ({
  default: () => <div>UiConceptsPageMock</div>,
}));

function renderAt(pathname: string) {
  window.history.pushState({}, "", pathname);
  return render(<AppRouter />);
}

describe("AppRouter smoke", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders root route", async () => {
    renderAt("/");
    expect(await screen.findByText("TranscriptionListPageMock")).toBeTruthy();
  });

  it("redirects unknown routes to root", async () => {
    renderAt("/unknown-route");
    expect(await screen.findByText("TranscriptionListPageMock")).toBeTruthy();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
  });

  it("keeps ui-concepts route private outside development mode", async () => {
    expect(import.meta.env.MODE).not.toBe("development");
    renderAt("/lab/ui-concepts");
    expect(await screen.findByText("TranscriptionListPageMock")).toBeTruthy();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
  });

  it("renders additive session and capture routes", async () => {
    renderAt("/sessions");
    expect(await screen.findByText("TranscriptionListPageMock")).toBeTruthy();

    cleanup();
    renderAt("/capture/realtime");
    expect(await screen.findByText("RealtimeSessionPageMock")).toBeTruthy();

    cleanup();
    renderAt("/capture/file");
    expect(await screen.findByText("TranscriptionListPageMock")).toBeTruthy();
  });

  it("keeps translate mode behind the feature flag by default", async () => {
    renderAt("/translate");
    expect(await screen.findByText("RealtimeSessionPageMock")).toBeTruthy();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/capture/realtime");
    });
  });
});
