import { describe, expect, it } from "vitest";
import {
  DEFAULT_REALTIME_CONNECTION_UX_STATE,
  classifyRealtimeLatencyLevel,
  reduceRealtimeConnectionUxState,
} from "./realtimeConnectionUx";

describe("reduceRealtimeConnectionUxState", () => {
  it("moves to reconnecting with attempt count", () => {
    const next = reduceRealtimeConnectionUxState(DEFAULT_REALTIME_CONNECTION_UX_STATE, {
      type: "reconnect-attempt",
      attempt: 2,
    });
    expect(next).toEqual({ phase: "reconnecting", reconnectAttempt: 2 });
  });

  it("returns to normal on socket open", () => {
    const reconnecting = { phase: "reconnecting", reconnectAttempt: 1 } as const;
    const next = reduceRealtimeConnectionUxState(reconnecting, { type: "socket-open" });
    expect(next).toEqual(DEFAULT_REALTIME_CONNECTION_UX_STATE);
  });

  it("moves to failed on permanent failure and allows manual retry transition", () => {
    const failed = reduceRealtimeConnectionUxState(
      { phase: "reconnecting", reconnectAttempt: 3 },
      { type: "permanent-failure" }
    );
    expect(failed).toEqual({ phase: "failed", reconnectAttempt: 0 });

    const retrying = reduceRealtimeConnectionUxState(failed, { type: "manual-retry" });
    expect(retrying).toEqual({ phase: "reconnecting", reconnectAttempt: 0 });
  });
});

describe("classifyRealtimeLatencyLevel", () => {
  it("returns unknown when no signal exists", () => {
    expect(classifyRealtimeLatencyLevel(null, null)).toBe("unknown");
  });

  it("returns stable for low latency and fresh updates", () => {
    expect(classifyRealtimeLatencyLevel(850, 900)).toBe("stable");
  });

  it("returns delayed for moderate latency", () => {
    expect(classifyRealtimeLatencyLevel(2200, 1200)).toBe("delayed");
  });

  it("returns critical for severe latency or stale stream", () => {
    expect(classifyRealtimeLatencyLevel(4600, 500)).toBe("critical");
    expect(classifyRealtimeLatencyLevel(900, 12000)).toBe("critical");
  });
});
