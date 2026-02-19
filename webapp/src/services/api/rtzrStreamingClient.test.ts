import { afterEach, describe, expect, it, vi } from "vitest";
import { RtzrStreamingClient } from "./rtzrStreamingClient";

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

describe("RtzrStreamingClient handshake", () => {
  it("calls onOpen only after ready ack and flushes buffered chunks", async () => {
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
