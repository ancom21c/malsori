import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UploadDialog from "./UploadDialog";

const mutationMocks = vi.hoisted(() => ({
  batch: {
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  },
  bulk: {
    isPending: false,
    items: [],
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  },
  realtime: {
    isPending: false,
    progress: { stage: "idle", percent: 0 },
    mutateAsync: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock("notistack", () => ({
  useSnackbar: () => ({
    enqueueSnackbar: vi.fn(),
  }),
}));

vi.mock("../hooks/useRequestFileTranscription", () => ({
  useRequestFileTranscription: () => mutationMocks.batch,
}));

vi.mock("../hooks/useRequestRealtimeFileTranscription", () => ({
  useRequestRealtimeFileTranscription: () => mutationMocks.realtime,
}));

vi.mock("../hooks/usePresets", () => ({
  usePresets: (type: string) => [
    {
      id: `${type}-default`,
      type,
      name: `${type} default`,
      configJson: "{}",
      isDefault: true,
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
    },
  ],
}));

vi.mock("../store/settingsStore", () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) =>
    selector({
      apiBaseUrl: "/",
      updateSetting: vi.fn(),
    }),
}));

vi.mock("../hooks/useAppPortalContainer", () => ({
  useAppPortalContainer: () => null,
}));

vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: (key: string, options?: { values?: Record<string, string | number> }) => {
      if (key === "selectedFilesSummary") {
        return `${options?.values?.count} files selected`;
      }
      return key;
    },
  }),
}));

vi.mock("../app/platformRoutes", () => ({
  buildSessionDetailPath: (id: string) => `/sessions/${id}`,
  resolveSessionsPath: () => "/sessions",
}));

vi.mock("../components/TranscriptionConfigQuickOptions", () => ({
  default: () => <div data-testid="quick-options" />,
}));

vi.mock("../components/BackendEndpointReadonlyCard", () => ({
  default: () => <div data-testid="backend-card" />,
}));

const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

function fileInput() {
  const input = document.body.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("file input not found");
  }
  return input;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UploadDialog", () => {
  it("allows multi-file selection in batch mode and renders the upload queue", () => {
    render(<UploadDialog open onClose={() => undefined} />);

    expect(fileInput().multiple).toBe(true);
    fireEvent.change(fileInput(), {
      target: {
        files: [
          new File(["a"], "alpha.wav", { type: "audio/wav" }),
          new File(["b"], "beta.wav", { type: "audio/wav" }),
        ],
      },
    });

    expect(screen.getByText("2 files selected")).toBeTruthy();
    expect(screen.getByText("uploadQueue")).toBeTruthy();
    expect(screen.getByText(/alpha\.wav/)).toBeTruthy();
    expect(screen.getByText(/beta\.wav/)).toBeTruthy();
  });

  it("keeps realtime API upload single-file only", () => {
    render(<UploadDialog open onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "realtimeApiFileUpload" }));

    expect(fileInput().multiple).toBe(false);
  });
});
