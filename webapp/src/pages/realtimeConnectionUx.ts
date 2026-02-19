export type RealtimeConnectionUxPhase = "normal" | "reconnecting" | "failed";

export type RealtimeConnectionUxState = {
  phase: RealtimeConnectionUxPhase;
  reconnectAttempt: number;
};

export type RealtimeConnectionUxEvent =
  | { type: "session-reset" }
  | { type: "streaming-error" }
  | { type: "reconnect-attempt"; attempt: number }
  | { type: "socket-open" }
  | { type: "manual-retry" }
  | { type: "recoverable-close" }
  | { type: "permanent-failure" };

export type RealtimeLatencyLevel = "unknown" | "stable" | "delayed" | "critical";

export const DEFAULT_REALTIME_CONNECTION_UX_STATE: RealtimeConnectionUxState = {
  phase: "normal",
  reconnectAttempt: 0,
};

const DELAYED_LATENCY_MS = 1800;
const CRITICAL_LATENCY_MS = 4000;
const DELAYED_STALE_MS = 5000;
const CRITICAL_STALE_MS = 10000;

export function reduceRealtimeConnectionUxState(
  state: RealtimeConnectionUxState,
  event: RealtimeConnectionUxEvent
): RealtimeConnectionUxState {
  switch (event.type) {
    case "session-reset":
    case "socket-open":
      return DEFAULT_REALTIME_CONNECTION_UX_STATE;
    case "streaming-error":
      return {
        phase: "reconnecting",
        reconnectAttempt: Math.max(1, state.reconnectAttempt),
      };
    case "reconnect-attempt":
      return {
        phase: "reconnecting",
        reconnectAttempt: Math.max(1, event.attempt),
      };
    case "manual-retry":
      return {
        phase: "reconnecting",
        reconnectAttempt: 0,
      };
    case "recoverable-close":
    case "permanent-failure":
      return {
        phase: "failed",
        reconnectAttempt: 0,
      };
    default:
      return state;
  }
}

export function classifyRealtimeLatencyLevel(
  latencyMs: number | null,
  staleMs: number | null
): RealtimeLatencyLevel {
  const normalizedLatency = Number.isFinite(latencyMs) ? Math.max(0, Number(latencyMs)) : null;
  const normalizedStale = Number.isFinite(staleMs) ? Math.max(0, Number(staleMs)) : null;

  if (normalizedLatency === null && normalizedStale === null) {
    return "unknown";
  }
  if (
    (normalizedLatency !== null && normalizedLatency >= CRITICAL_LATENCY_MS) ||
    (normalizedStale !== null && normalizedStale >= CRITICAL_STALE_MS)
  ) {
    return "critical";
  }
  if (
    (normalizedLatency !== null && normalizedLatency >= DELAYED_LATENCY_MS) ||
    (normalizedStale !== null && normalizedStale >= DELAYED_STALE_MS)
  ) {
    return "delayed";
  }
  return "stable";
}
