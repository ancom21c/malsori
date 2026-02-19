import { describe, expect, it } from "vitest";
import { initialSyncState, syncStateReducer, type SyncState } from "./syncStateMachine";

function reduce(events: Array<Parameters<typeof syncStateReducer>[1]>): SyncState {
  return events.reduce(syncStateReducer, initialSyncState);
}

describe("syncStateReducer", () => {
  it("transitions from idle to cooldown on successful run request", () => {
    const state = reduce([
      { type: "REQUEST_SYNC", trigger: "immediate" },
      { type: "RUN_STARTED" },
      { type: "RUN_SUCCESS" },
    ]);

    expect(state.phase).toBe("cooldown");
    expect(state.queued).toBe(false);
    expect(state.lastError).toBeNull();
  });

  it("collapses duplicate requests while running and schedules one more run", () => {
    const state = reduce([
      { type: "REQUEST_SYNC", trigger: "manual" },
      { type: "RUN_STARTED" },
      { type: "REQUEST_SYNC", trigger: "immediate" },
      { type: "REQUEST_SYNC", trigger: "interval" },
      { type: "RUN_SUCCESS" },
    ]);

    expect(state.phase).toBe("scheduled");
    expect(state.queued).toBe(false);
    expect(state.lastTrigger).toBe("interval");
  });

  it("moves to error on failure and retries on next request", () => {
    const afterFailure = reduce([
      { type: "REQUEST_SYNC", trigger: "manual" },
      { type: "RUN_STARTED" },
      { type: "RUN_FAILURE", error: "push_failed" },
    ]);

    expect(afterFailure.phase).toBe("error");
    expect(afterFailure.lastError).toBe("push_failed");

    const afterRetry = syncStateReducer(afterFailure, {
      type: "REQUEST_SYNC",
      trigger: "interval",
    });

    expect(afterRetry.phase).toBe("scheduled");
    expect(afterRetry.lastError).toBeNull();
  });

  it("resets to initial state", () => {
    const activeState = reduce([
      { type: "REQUEST_SYNC", trigger: "manual" },
      { type: "RUN_STARTED" },
      { type: "REQUEST_SYNC", trigger: "immediate" },
    ]);

    const reset = syncStateReducer(activeState, { type: "RESET" });
    expect(reset).toEqual(initialSyncState);
  });
});
