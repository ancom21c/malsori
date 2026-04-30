import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appDb } from "../data/app-db";
import { useSettingsStore } from "../store/settingsStore";
import { useRequestRealtimeFileTranscription } from "./useRequestRealtimeFileTranscription";

const snackbarMock = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn(),
}));

const audioMock = vi.hoisted(() => ({
  decodeAudioFileToPcm: vi.fn(),
  extractSampleRateFromAudioConfig: vi.fn(),
}));

const streamingMock = vi.hoisted(() => ({
  instances: [] as unknown[],
  closeOnFinal: false,
  finalPayloadOnFinal: null as unknown,
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
  extractModelNameFromConfig: () => "sommers",
  resolveBackendEndpointSnapshot: () =>
    Promise.resolve({
      id: "server-default",
      name: "Server default",
      source: "server-default",
      deployment: undefined,
      apiBaseUrl: "http://localhost:8000",
    }),
}));

vi.mock("../services/audio/decodeAudioFile", () => audioMock);

vi.mock("../services/api/rtzrStreamingClient", () => ({
  RtzrStreamingClient: class {
    options?: {
      onOpen?: () => void;
      onClose?: (event: CloseEvent) => void;
      onMessage?: (event: MessageEvent) => void;
    };

    connect = vi.fn((options) => {
      this.options = options;
      streamingMock.instances.push(this);
      queueMicrotask(() => options.onOpen?.());
    });

    disconnect = vi.fn();

    requestFinal = vi.fn(() => {
      if (streamingMock.finalPayloadOnFinal) {
        this.options?.onMessage?.(
          new MessageEvent("message", { data: streamingMock.finalPayloadOnFinal })
        );
      }
      if (streamingMock.closeOnFinal) {
        this.options?.onClose?.(new CloseEvent("close", { code: 1000 }));
      }
    });

    sendAudioChunk = vi.fn();
  },
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

function makeFile() {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const file = new File([bytes], "sample.wav", {
    type: "audio/wav",
  });
  Object.defineProperty(file, "slice", {
    value: (start = 0, end = bytes.byteLength) => {
      const chunk = bytes.slice(start, end);
      return {
        arrayBuffer: async () => chunk.buffer.slice(0),
      };
    },
  });
  return file;
}

beforeEach(async () => {
  vi.clearAllMocks();
  streamingMock.instances = [];
  streamingMock.closeOnFinal = false;
  streamingMock.finalPayloadOnFinal = null;
  audioMock.extractSampleRateFromAudioConfig.mockReturnValue(16000);
  audioMock.decodeAudioFileToPcm.mockResolvedValue({
    pcm: new Int16Array([1, 2, 3, 4]),
    sampleRate: 16000,
    durationMs: 1,
  });
  await appDb.delete();
  await appDb.open();
  useSettingsStore.setState({
    apiBaseUrl: "http://localhost:8000",
    activeBackendPresetId: null,
    defaultSpeakerName: "Speaker",
  });
});

describe("useRequestRealtimeFileTranscription", () => {
  it("marks the local row failed when finalization returns no final segments", async () => {
    streamingMock.closeOnFinal = true;
    const { result } = renderHook(() => useRequestRealtimeFileTranscription(), {
      wrapper: createWrapper(),
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({
          title: "empty-result",
          configJson: "{}",
          file: makeFile(),
        });
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("noRealtimeTranscriptionResultsReturned");

    const records = await appDb.transcriptions.toArray();
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("failed");
    expect(records[0].errorMessage).toBe("noRealtimeTranscriptionResultsReturned");
  });

  it("rejects and fails the local row when a running realtime upload is cancelled", async () => {
    const { result } = renderHook(() => useRequestRealtimeFileTranscription(), {
      wrapper: createWrapper(),
    });

    let uploadPromise: Promise<{ localId: string }> | undefined;
    act(() => {
      uploadPromise = result.current.mutateAsync({
        title: "cancelled",
        configJson: "{}",
        file: makeFile(),
      });
    });

    await waitFor(() => {
      expect(result.current.progress.stage).toBe("finalizing");
    });

    act(() => {
      result.current.cancel();
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await uploadPromise;
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("theSessionHasBeenAborted");
    const records = await appDb.transcriptions.toArray();
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("failed");
    expect(records[0].errorMessage).toBe("theSessionHasBeenAborted");
  });

  it("reports pre-row validation errors through snackbar", async () => {
    useSettingsStore.setState({ apiBaseUrl: "" });
    const { result } = renderHook(() => useRequestRealtimeFileTranscription(), {
      wrapper: createWrapper(),
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({
          title: "invalid",
          configJson: "{}",
          file: makeFile(),
        });
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("pleaseSetThePythonApiBaseUrlFirst");
    expect(snackbarMock.enqueueSnackbar).toHaveBeenCalledWith(
      "pleaseSetThePythonApiBaseUrlFirst",
      { variant: "warning" }
    );
    await expect(appDb.transcriptions.count()).resolves.toBe(0);
  });
});
