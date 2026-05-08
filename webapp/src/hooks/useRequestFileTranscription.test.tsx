import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appDb } from "../data/app-db";
import { useSettingsStore } from "../store/settingsStore";
import { useRequestFileTranscription } from "./useRequestFileTranscription";

const snackbarMock = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn(),
}));

const apiClientMock = vi.hoisted(() => ({
  requestFileTranscription: vi.fn(),
}));

vi.mock("notistack", () => ({
  useSnackbar: () => snackbarMock,
}));

vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../utils/transcriptionMetadata", () => ({
  extractModelNameFromConfigJson: () => "sommers",
  resolveBackendEndpointSnapshot: () =>
    Promise.resolve({
      id: "server-default",
      name: "Server default",
      source: "server-default",
      deployment: "cloud",
      apiBaseUrl: "http://localhost:8000",
    }),
}));

vi.mock("../services/api/rtzrApiClientContext", () => ({
  useRtzrApiClient: () => apiClientMock,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makeFile(name: string, bytes: number[]) {
  const data = new Uint8Array(bytes);
  const file = new File([data], name, { type: "audio/wav" });
  Object.defineProperty(file, "slice", {
    value: (start = 0, end = data.byteLength) => {
      const chunk = data.slice(start, end);
      return {
        arrayBuffer: async () => chunk.buffer.slice(0),
      };
    },
  });
  return file;
}

beforeEach(async () => {
  vi.clearAllMocks();
  await appDb.delete();
  await appDb.open();
  useSettingsStore.setState({ activeBackendPresetId: null });
});

describe("useRequestFileTranscription", () => {
  it("creates a local processing row and can suppress per-file notifications", async () => {
    apiClientMock.requestFileTranscription.mockImplementation(async ({ file }) => ({
      transcribeId: `remote-${file.name}`,
      status: "queued",
      createdAt: "2026-05-06T00:00:00.000Z",
    }));
    const file = makeFile("alpha.wav", [1, 2]);
    const { result } = renderHook(() => useRequestFileTranscription(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        title: "Daily standup - alpha",
        configJson: "{}",
        file,
        suppressNotifications: true,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.remoteId).toBe("remote-alpha.wav");
    expect(apiClientMock.requestFileTranscription).toHaveBeenCalledTimes(1);

    const records = await appDb.transcriptions.toArray();
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Daily standup - alpha");
    expect(records[0].status).toBe("processing");
    expect(records[0].sourceFileName).toBe("alpha.wav");
    expect(snackbarMock.enqueueSnackbar).not.toHaveBeenCalled();
  });
});
