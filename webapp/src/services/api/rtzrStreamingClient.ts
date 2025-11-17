export type StreamingConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

export interface StreamingSessionOptions {
  baseUrl: string;
  decoderConfig: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  keepAliveIntervalMs?: number;
  reconnectAttempts?: number;
  reconnectBackoffMs?: number;
  onMessage: (message: MessageEvent) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onOpen?: () => void;
  onReconnectAttempt?: (attempt: number) => void;
  onPermanentFailure?: (event: CloseEvent | Event) => void;
}

const DEFAULT_KEEP_ALIVE_MS = 20_000;
const DEFAULT_RECONNECT_ATTEMPTS = 3;
const DEFAULT_RECONNECT_BACKOFF_MS = 1_500;
const MAX_PENDING_CHUNKS = 24;
const HANDSHAKE_TIMEOUT_MS = 1_500;

/**
 * Resilient WebSocket client for the RTZR streaming API.
 * Handles handshake, keep-alive ping messages, reconnect backoff,
 * and chunk buffering while the socket is reconnecting.
 */
export class RtzrStreamingClient {
  private socket: WebSocket | null = null;
  private state: StreamingConnectionState = "idle";
  private options: (StreamingSessionOptions & {
    keepAliveIntervalMs: number;
    reconnectAttempts: number;
    reconnectBackoffMs: number;
  }) | null = null;
  private shouldReconnect = false;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private keepAliveTimer: number | null = null;
  private pendingChunks: ArrayBuffer[] = [];
  private handshakeComplete = false;
  private handshakeTimer: number | null = null;

  get connectionState(): StreamingConnectionState {
    return this.state;
  }

  connect(options: StreamingSessionOptions) {
    this.cleanupSocket();
    this.options = {
      ...options,
      keepAliveIntervalMs: options.keepAliveIntervalMs ?? DEFAULT_KEEP_ALIVE_MS,
      reconnectAttempts: options.reconnectAttempts ?? DEFAULT_RECONNECT_ATTEMPTS,
      reconnectBackoffMs: options.reconnectBackoffMs ?? DEFAULT_RECONNECT_BACKOFF_MS,
    };
    this.shouldReconnect = true;
    this.reconnectAttempt = 0;
    this.pendingChunks = [];
    this.handshakeComplete = false;
    this.clearHandshakeTimer();
    this.state = "connecting";
    this.openSocket();
  }

  sendAudioChunk(chunk: ArrayBuffer | ArrayBufferView) {
    const buffer = this.prepareAudioBuffer(chunk);
    if (!buffer) return;
    if (this.socket && this.state === "open" && this.handshakeComplete) {
      this.socket.send(buffer);
      return;
    }
    if (this.shouldReconnect || (this.socket && !this.handshakeComplete)) {
      this.enqueueChunk(buffer);
    }
  }

  requestFinal() {
    this.shouldReconnect = false;
    if (this.socket && this.state === "open") {
      this.socket.send(JSON.stringify({ type: "final" }));
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.cleanupSocket();
    this.pendingChunks = [];
    this.state = "closed";
  }

  private openSocket() {
    if (!this.options) return;
    const wsUrl = this.toWebSocketUrl(this.options.baseUrl);
    this.cleanupSocket();

    try {
      this.socket = new WebSocket(`${wsUrl}/v1/streaming`);
    } catch (error) {
      this.state = "error";
      this.options.onError?.(error as Event);
      this.handlePermanentFailure(error as Event);
      return;
    }

    this.state = "connecting";

    this.socket.onopen = () => {
      this.state = "open";
      this.reconnectAttempt = 0;
      this.startKeepAlive();
      this.initiateHandshake();
    };

    this.socket.onmessage = (event) => {
      void this.handleSocketMessage(event);
    };

    this.socket.onerror = (event) => {
      this.state = "error";
      this.options?.onError?.(event);
    };

    this.socket.onclose = (event) => {
      this.cleanupKeepAlive();
      this.clearHandshakeTimer();
      this.handshakeComplete = false;
      if (this.shouldReconnect && this.reconnectAttempt < (this.options?.reconnectAttempts ?? 0)) {
        this.scheduleReconnect();
      } else {
        this.state = "closed";
        this.options?.onClose?.(event);
        if (event.code !== 1000) {
          this.handlePermanentFailure(event);
        }
      }
    };
  }

  private initiateHandshake() {
    if (!this.options || !this.socket) return;
    this.handshakeComplete = false;
    this.startHandshakeTimer();
    this.sendHandshakePayload();
  }

  private startHandshakeTimer() {
    this.clearHandshakeTimer();
    this.handshakeTimer = window.setTimeout(() => {
      this.markHandshakeComplete();
    }, HANDSHAKE_TIMEOUT_MS);
  }

  private clearHandshakeTimer() {
    if (this.handshakeTimer) {
      window.clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
  }

  private markHandshakeComplete() {
    if (this.handshakeComplete) {
      return;
    }
    this.handshakeComplete = true;
    this.clearHandshakeTimer();
    this.flushPendingChunks();
    this.options?.onOpen?.();
  }

  private sendHandshakePayload() {
    if (!this.options || !this.socket) return;
    const message = {
      type: "start",
      data: {
        decoder_config: this.options.decoderConfig,
        metadata: this.options.metadata ?? {},
      },
    };
    this.socket.send(JSON.stringify(message));
  }

  private async handleSocketMessage(event: MessageEvent) {
    let normalized: unknown;
    try {
      normalized = await this.normalizeMessageData(event.data);
    } catch {
      normalized = event.data;
    }

    if (this.isHandshakeAck(normalized)) {
      this.markHandshakeComplete();
    }

    if (this.isServerPing(normalized)) {
      this.respondToServerPing();
      return;
    }

    const dataForCallback =
      normalized === undefined ? event.data : normalized;
    const messageEvent =
      dataForCallback === event.data || typeof MessageEvent === "undefined"
        ? event
        : new MessageEvent("message", { data: dataForCallback });
    this.options?.onMessage(messageEvent);
  }

  private async normalizeMessageData(data: MessageEvent["data"]): Promise<unknown> {
    if (typeof data === "string") {
      const parsed = this.tryParseJson(data);
      return parsed ?? data;
    }
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = this.tryParseJson(text);
        return parsed ?? text;
      } catch {
        return data;
      }
    }
    if (data instanceof ArrayBuffer) {
      if (typeof TextDecoder !== "undefined") {
        const text = new TextDecoder().decode(new Uint8Array(data));
        const parsed = this.tryParseJson(text);
        return parsed ?? text;
      }
      return data;
    }
    if (ArrayBuffer.isView(data)) {
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      return await this.normalizeMessageData(buffer);
    }
    return data;
  }

  private tryParseJson(text: string): unknown | null {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private isHandshakeAck(payload: unknown): boolean {
    if (!payload || typeof payload !== "object") {
      return false;
    }
    const type = this.extractMessageType(payload as Record<string, unknown>);
    if (
      type &&
      ["ready", "session_ready", "session", "started", "session_started", "ack", "start_response", "start_ack"].includes(
        type
      )
    ) {
      return true;
    }
    if ((payload as { ready?: unknown }).ready === true) {
      return true;
    }
    if ((payload as { status?: unknown }).status === "ready") {
      return true;
    }
    return false;
  }

  private extractMessageType(payload: Record<string, unknown>): string | undefined {
    const candidates: Array<keyof typeof payload> = ["type", "event", "state"];
    for (const key of candidates) {
      const value = payload[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim().toLowerCase();
      }
    }
    return undefined;
  }

  private isServerPing(payload: unknown): boolean {
    if (!payload || typeof payload !== "object") {
      return false;
    }
    const type = this.extractMessageType(payload as Record<string, unknown>);
    return type === "ping";
  }

  private respondToServerPing() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "pong" }));
    }
  }

  private scheduleReconnect() {
    if (!this.options) return;
    this.reconnectAttempt += 1;
    this.state = "connecting";
    this.options.onReconnectAttempt?.(this.reconnectAttempt);
    const delay = this.options.reconnectBackoffMs * this.reconnectAttempt;

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.openSocket();
    }, delay);
  }

  private enqueueChunk(buffer: ArrayBuffer) {
    if (this.pendingChunks.length >= MAX_PENDING_CHUNKS) {
      // Drop the oldest chunk to keep memory in check.
      this.pendingChunks.shift();
    }
    this.pendingChunks.push(buffer.slice(0));
  }

  private flushPendingChunks() {
    if (!this.socket || this.state !== "open" || !this.handshakeComplete) return;
    while (this.pendingChunks.length > 0) {
      const chunk = this.pendingChunks.shift();
      if (chunk) {
        this.socket.send(chunk);
      }
    }
  }

  private startKeepAlive() {
    if (!this.options || !this.socket) return;
    this.cleanupKeepAlive();
    this.keepAliveTimer = window.setInterval(() => {
      if (this.socket && this.state === "open") {
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, this.options.keepAliveIntervalMs);
  }

  private cleanupKeepAlive() {
    if (this.keepAliveTimer) {
      window.clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private cleanupSocket() {
    this.cleanupKeepAlive();
    this.clearHandshakeTimer();
    this.handshakeComplete = false;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }
  }

  private handlePermanentFailure(event: CloseEvent | Event) {
    this.shouldReconnect = false;
    this.clearHandshakeTimer();
    this.handshakeComplete = false;
    this.options?.onPermanentFailure?.(event);
  }

  private prepareAudioBuffer(chunk: ArrayBuffer | ArrayBufferView): ArrayBuffer | null {
    if (chunk instanceof ArrayBuffer) {
      return chunk.slice(0);
    }
    if (chunk instanceof Float32Array) {
      const int16 = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const clamped = Math.max(-1, Math.min(1, chunk[i]));
        int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }
      return int16.buffer;
    }
    if (ArrayBuffer.isView(chunk)) {
      const view = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      const copy = new Uint8Array(view.length);
      copy.set(view);
      return copy.buffer;
    }
    return null;
  }

  private toWebSocketUrl(baseUrl: string) {
    if (baseUrl.startsWith("ws")) {
      return baseUrl.replace(/\/$/, "");
    }
    if (baseUrl.startsWith("https")) {
      return baseUrl.replace(/^https/i, "wss").replace(/\/$/, "");
    }
    if (baseUrl.startsWith("http")) {
      return baseUrl.replace(/^http/i, "ws").replace(/\/$/, "");
    }
    throw new Error("유효한 API Base URL이 필요합니다.");
  }
}
