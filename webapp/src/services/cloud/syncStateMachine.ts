export type SyncPhase = "idle" | "scheduled" | "running" | "cooldown" | "error";

export type SyncTrigger = "startup" | "interval" | "manual" | "immediate";

export interface SyncState {
  phase: SyncPhase;
  queued: boolean;
  lastTrigger: SyncTrigger | null;
  lastError: string | null;
}

export type SyncEvent =
  | { type: "REQUEST_SYNC"; trigger: SyncTrigger }
  | { type: "RUN_STARTED" }
  | { type: "RUN_SUCCESS" }
  | { type: "RUN_FAILURE"; error?: string }
  | { type: "RESET" };

export const initialSyncState: SyncState = {
  phase: "idle",
  queued: false,
  lastTrigger: null,
  lastError: null,
};

export function syncStateReducer(state: SyncState, event: SyncEvent): SyncState {
  switch (event.type) {
    case "REQUEST_SYNC": {
      if (state.phase === "running") {
        return {
          ...state,
          queued: true,
          lastTrigger: event.trigger,
        };
      }
      if (state.phase === "scheduled") {
        return {
          ...state,
          lastTrigger: event.trigger,
        };
      }
      return {
        ...state,
        phase: "scheduled",
        queued: false,
        lastTrigger: event.trigger,
        lastError: null,
      };
    }
    case "RUN_STARTED": {
      if (state.phase !== "scheduled") {
        return state;
      }
      return {
        ...state,
        phase: "running",
        queued: false,
      };
    }
    case "RUN_SUCCESS": {
      if (state.phase !== "running") {
        return state;
      }
      if (state.queued) {
        return {
          ...state,
          phase: "scheduled",
          queued: false,
          lastError: null,
        };
      }
      return {
        ...state,
        phase: "cooldown",
        lastError: null,
      };
    }
    case "RUN_FAILURE": {
      if (state.phase !== "running") {
        return state;
      }
      if (state.queued) {
        return {
          ...state,
          phase: "scheduled",
          queued: false,
          lastError: event.error ?? "sync_failure",
        };
      }
      return {
        ...state,
        phase: "error",
        lastError: event.error ?? "sync_failure",
      };
    }
    case "RESET":
      return initialSyncState;
    default:
      return state;
  }
}
