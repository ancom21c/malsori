import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_STREAMING_BUFFER_METRICS,
  RtzrStreamingClient,
  calculateDefaultBufferedAudioBudgetMs,
} from "./rtzrStreamingClient";

type ClosePayload = { code?: number; reason?: string };

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  readonly url: string;
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  sent: unknown[] = [];
  closeCalls: ClosePayload[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: unknown) {
    this.sent.push(data);
  }

  close(code?: number, reason?: string) {
    this.closeCalls.push({ code, reason });
    this.emitClose(code ?? 1000, reason ?? "");
  }

  emitOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  emitMessage(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }

  emitClose(code = 1000, reason = "") {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason } as CloseEvent);
  }
}

const originalWebSocket = globalThis.WebSocket;

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
  MockWebSocket.instances = [];
  vi.useRealTimers();
});

function toBytes(value: unknown): number[] {
  if (!(value instanceof ArrayBuffer)) {
    return [];
  }
  return Array.from(new Uint8Array(value));
}

describe("RtzrStreamingClient handshake", () => {
  it("calls onOpen only after ready ack and flushes buffered chunks", async () => {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    const onOpen = vi.fn();
    const onMessage = vi.fn();
    const onBufferMetrics = vi.fn();

    const client = new RtzrStreamingClient();
    client.connect({
      baseUrl: "ws://localhost:8000",
      decoderConfig: {},
      onMessage,
      onOpen,
      onBufferMetrics,
      handshakeTimeoutMs: 200,
    });

    const ws = MockWebSocket.instances[0];
    expect(ws).toBeTruthy();
    ws.emitOpen();

    client.sendAudioChunk(new Uint8Array([1, 2, 3]));
    expect(onOpen).not.toHaveBeenCalled();
    expect(ws.sent.length).toBe(1);
    expect(typeof ws.sent[0]).toBe("string");

    ws.emitMessage(JSON.stringify({ type: "ready" }));
    await Promise.resolve();

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(ws.sent.length).toBe(2);
    expect(ws.sent[1] instanceof ArrayBuffer).toBe(true);
    expect(onBufferMetrics).toHaveBeenLastCalledWith({
      ...EMPTY_STREAMING_BUFFER_METRICS,
      attemptedBufferedAudioMs: 0,
    });
  });

  it("opens when first recognition payload arrives even without explicit ready ack", async () => {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    const onOpen = vi.fn();
    const onMessage = vi.fn();

    const client = new RtzrStreamingClient();
    client.connect({
      baseUrl: "ws://localhost:8000",
      decoderConfig: {},
      onMessage,
      onOpen,
      handshakeTimeoutMs: 200,
    });

    const ws = MockWebSocket.instances[0];
    ws.emitOpen();
    client.sendAudioChunk(new Uint8Array([7, 8, 9]));
    expect(onOpen).not.toHaveBeenCalled();
    expect(ws.sent.length).toBe(1);

    ws.emitMessage(JSON.stringify({ type: "partial", text: "hello" }));
    await Promise.resolve();

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(ws.sent.length).toBe(2);
    expect(ws.sent[1] instanceof ArrayBuffer).toBe(true);
  });

  it("keeps buffered audio within the duration budget and marks degraded when it drops audio", async () => {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    const onMessage = vi.fn();
    const onBufferMetrics = vi.fn();

    const client = new RtzrStreamingClient();
    client.connect({
      baseUrl: "ws://localhost:8000",
      decoderConfig: {},
      onMessage,
      onBufferMetrics,
      handshakeTimeoutMs: 200,
      maxBufferedAudioMs: 1200,
    });

    const ws = MockWebSocket.instances[0];
    ws.emitOpen();

    client.sendAudioChunk(new Uint8Array([1]), { durationMs: 800 });
    client.sendAudioChunk(new Uint8Array([2]), { durationMs: 800 });

    expect(onBufferMetrics).toHaveBeenLastCalledWith({
      bufferedAudioMs: 800,
      replayedBufferedAudioMs: 0,
      droppedBufferedAudioMs: 800,
      attemptedBufferedAudioMs: 1600,
      droppedBufferedAudioRatio: 0.5,
      degraded: true,
    });

    ws.emitMessage(JSON.stringify({ type: "ready" }));
    await Promise.resolve();

    expect(ws.sent.length).toBe(2);
    expect(toBytes(ws.sent[1])).toEqual([2]);
    expect(onBufferMetrics).toHaveBeenLastCalledWith({
      bufferedAudioMs: 0,
      replayedBufferedAudioMs: 800,
      droppedBufferedAudioMs: 800,
      attemptedBufferedAudioMs: 1600,
      droppedBufferedAudioRatio: 0.5,
      degraded: true,
    });
  });

  it("counts buffered audio as dropped when disconnecting before reconnect completes", () => {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    const onMessage = vi.fn();
    const onBufferMetrics = vi.fn();

    const client = new RtzrStreamingClient();
    client.connect({
      baseUrl: "ws://localhost:8000",
      decoderConfig: {},
      onMessage,
      onBufferMetrics,
      handshakeTimeoutMs: 200,
      maxBufferedAudioMs: 3000,
    });

    const ws = MockWebSocket.instances[0];
    ws.emitOpen();

    client.sendAudioChunk(new Uint8Array([1, 2]), { durationMs: 1200 });
    client.disconnect();

    expect(onBufferMetrics).toHaveBeenLastCalledWith({
      bufferedAudioMs: 0,
      replayedBufferedAudioMs: 0,
      droppedBufferedAudioMs: 1200,
      attemptedBufferedAudioMs: 1200,
      droppedBufferedAudioRatio: 1,
      degraded: true,
    });
  });

  it("replays buffered audio and sends final after reconnect when final was requested mid-recovery", async () => {
    vi.useFakeTimers();
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    const onMessage = vi.fn();
    const onReconnectAttempt = vi.fn();
    const onBufferMetrics = vi.fn();

    const client = new RtzrStreamingClient();
    client.connect({
      baseUrl: "ws://localhost:8000",
      decoderConfig: {},
      onMessage,
      onReconnectAttempt,
      onBufferMetrics,
      reconnectAttempts: 1,
      reconnectBackoffMs: 10,
      handshakeTimeoutMs: 200,
      maxBufferedAudioMs: 1000,
    });

    const first = MockWebSocket.instances[0];
    first.emitOpen();
    first.emitMessage(JSON.stringify({ type: "ready" }));
    await Promise.resolve();

    first.emitClose(1011, "temporary");
    expect(onReconnectAttempt).toHaveBeenCalledTimes(1);

    client.sendAudioChunk(new Uint8Array([9, 8]), { durationMs: 600 });
    client.requestFinal();

    vi.advanceTimersByTime(15);
    const second = MockWebSocket.instances[1];
    expect(second).toBeTruthy();
    second.emitOpen();
    expect(typeof second.sent[0]).toBe("string");

    second.emitMessage(JSON.stringify({ type: "ready" }));
    await Promise.resolve();

    expect(onBufferMetrics).toHaveBeenLastCalledWith({
      bufferedAudioMs: 0,
      replayedBufferedAudioMs: 600,
      droppedBufferedAudioMs: 0,
      attemptedBufferedAudioMs: 600,
      droppedBufferedAudioRatio: 0,
      degraded: false,
    });
    expect(second.sent).toContain(JSON.stringify({ type: "final" }));
    expect(
      second.sent.some((payload) => payload instanceof ArrayBuffer && toBytes(payload).join(",") === "9,8")
    ).toBe(true);

    second.emitClose(1000, "");
    vi.advanceTimersByTime(20);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("fails with STREAM_ACK_TIMEOUT when ack is not received", () => {
    vi.useFakeTimers();
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    const onMessage = vi.fn();
    const onReconnectAttempt = vi.fn();
    const onPermanentFailure = vi.fn();
    const onError = vi.fn();

    const client = new RtzrStreamingClient();
    client.connect({
      baseUrl: "ws://localhost:8000",
      decoderConfig: {},
      onMessage,
      onError,
      onReconnectAttempt,
      onPermanentFailure,
      reconnectAttempts: 1,
      reconnectBackoffMs: 10,
      handshakeTimeoutMs: 30,
    });

    const first = MockWebSocket.instances[0];
    first.emitOpen();
    vi.advanceTimersByTime(35);
    expect(first.closeCalls[0]?.reason).toBe("STREAM_ACK_TIMEOUT");
    expect(onError).toHaveBeenCalled();
    expect(onReconnectAttempt).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(15);
    const second = MockWebSocket.instances[1];
    expect(second).toBeTruthy();
    second.emitOpen();
    vi.advanceTimersByTime(35);
    expect(onPermanentFailure).toHaveBeenCalledTimes(1);
  });
});

describe("calculateDefaultBufferedAudioBudgetMs", () => {
  it("matches reconnect tolerance with an upper cap", () => {
    expect(
      calculateDefaultBufferedAudioBudgetMs({
        reconnectAttempts: 3,
        reconnectBackoffMs: 1500,
        handshakeTimeoutMs: 3000,
      })
    ).toBe(12000);

    expect(
      calculateDefaultBufferedAudioBudgetMs({
        reconnectAttempts: 10,
        reconnectBackoffMs: 3000,
        handshakeTimeoutMs: 3000,
      })
    ).toBe(20000);
  });
});
