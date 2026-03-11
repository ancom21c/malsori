import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { useGoogleAuth } from "../auth/GoogleAuthProvider";
import { GoogleDriveService } from "./googleDriveService";
import { SyncManager } from "./syncManager";
import { initialSyncState, syncStateReducer, type SyncTrigger } from "./syncStateMachine";

interface SyncContextType {
    syncManager: SyncManager | null;
    isSyncing: boolean;
    lastSyncedAt: Date | null;
    accountKey: string | null;
    syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

import { ConflictResolutionDialog } from "../../components/ConflictResolutionDialog";
import { appDb } from "../../data/app-db";

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, token, signOut } = useGoogleAuth();
    const tokenRef = useRef<string | null>(null);
    const syncManagerRef = useRef<SyncManager | null>(null);
    const runInFlightRef = useRef(false);
    const [syncManager, setSyncManager] = useState<SyncManager | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
    const [pendingSyncManager, setPendingSyncManager] = useState<SyncManager | null>(null);
    const [accountKey, setAccountKey] = useState<string | null>(null);
    const [pendingAccountKey, setPendingAccountKey] = useState<string | null>(null);
    const syncIntervalRef = useRef<number | null>(null);
    const [syncState, dispatchSyncEvent] = useReducer(syncStateReducer, initialSyncState);

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    const requestSync = useCallback((trigger: SyncTrigger) => {
        if (!syncManagerRef.current) {
            return;
        }
        dispatchSyncEvent({ type: "REQUEST_SYNC", trigger });
    }, []);

    const syncNow = useCallback(() => {
        requestSync("manual");
        return Promise.resolve();
    }, [requestSync]);

    useEffect(() => {
        setIsSyncing(syncState.phase === "running");
    }, [syncState.phase]);

    useEffect(() => {
        const initSync = async () => {
            if (isAuthenticated) {
                const driveService = new GoogleDriveService(async () => {
                    const current = tokenRef.current;
                    if (!current) {
                        throw new Error("Google Drive token is missing");
                    }
                    return current;
                });
                const manager = new SyncManager(driveService);

                let nextAccountKey: string | null = null;
                try {
                    nextAccountKey = await manager.getAccountKey();
                } catch (error) {
                    console.error("Failed to resolve Drive account key:", error);
                }

                const lastAccount = localStorage.getItem("last_synced_account");
                if (lastAccount && nextAccountKey && lastAccount !== nextAccountKey) {
                    // Conflict detected
                    setPendingSyncManager(manager);
                    setPendingAccountKey(nextAccountKey);
                    setConflictDialogOpen(true);
                } else {
                    // No conflict or same account
                    setSyncManager(manager);
                    setAccountKey(nextAccountKey);
                    setPendingAccountKey(null);
                    if (nextAccountKey) {
                        localStorage.setItem("last_synced_account", nextAccountKey);
                    }
                }
            } else {
                setSyncManager(null);
                setPendingSyncManager(null);
                setAccountKey(null);
                setPendingAccountKey(null);
            }
        };
        void initSync();
    }, [isAuthenticated]);

    const handleMerge = () => {
        if (pendingSyncManager) {
            syncManagerRef.current = pendingSyncManager;
            setSyncManager(pendingSyncManager);
            setAccountKey(pendingAccountKey);
            if (pendingAccountKey) {
                localStorage.setItem("last_synced_account", pendingAccountKey);
            }
            setConflictDialogOpen(false);
            setPendingSyncManager(null);
            setPendingAccountKey(null);
            requestSync("immediate");
        }
    };

    const handleReplace = async () => {
        if (pendingSyncManager) {
            // Wipe local data
            await appDb.transaction(
                "rw",
                [
                    appDb.transcriptions,
                    appDb.segments,
                    appDb.audioChunks,
                    appDb.videoChunks,
                    appDb.searchIndexes,
                    appDb.summaryPartitions,
                    appDb.summaryRuns,
                    appDb.publishedSummaries,
                ],
                async () => {
                    await appDb.transcriptions.clear();
                    await appDb.segments.clear();
                    await appDb.audioChunks.clear();
                    await appDb.videoChunks.clear();
                    await appDb.searchIndexes.clear();
                    await appDb.summaryPartitions.clear();
                    await appDb.summaryRuns.clear();
                    await appDb.publishedSummaries.clear();
                }
            );

            setSyncManager(pendingSyncManager);
            syncManagerRef.current = pendingSyncManager;
            setAccountKey(pendingAccountKey);
            if (pendingAccountKey) {
                localStorage.setItem("last_synced_account", pendingAccountKey);
            }
            setConflictDialogOpen(false);
            setPendingSyncManager(null);
            setPendingAccountKey(null);
            requestSync("immediate");
        }
    };

    const handleCancel = () => {
        setConflictDialogOpen(false);
        setPendingSyncManager(null);
        setPendingAccountKey(null);
        signOut(); // Disconnect the conflicting account
    };

    useEffect(() => {
        if (syncState.phase !== "scheduled" || runInFlightRef.current) {
            return;
        }
        const manager = syncManagerRef.current;
        if (!manager) {
            dispatchSyncEvent({ type: "RESET" });
            return;
        }

        runInFlightRef.current = true;
        dispatchSyncEvent({ type: "RUN_STARTED" });

        const runSyncCycle = async () => {
            let hasFailure = false;
            let failureReason: string | undefined;
            try {
                try {
                    const pullSummary = await manager.pullUpdates();
                    if (pullSummary.failed > 0) {
                        hasFailure = true;
                        failureReason = "pull_partial_failure";
                    }
                } catch (error) {
                    hasFailure = true;
                    failureReason = "pull_failed";
                    console.error("Sync pull failed:", error);
                }

                try {
                    const pushSummary = await manager.pushUpdates();
                    if (pushSummary.failed > 0) {
                        hasFailure = true;
                        failureReason = "push_partial_failure";
                    }
                } catch (error) {
                    hasFailure = true;
                    failureReason = "push_failed";
                    console.error("Sync push failed:", error);
                }

                if (syncManagerRef.current !== manager) {
                    return;
                }
                if (!hasFailure) {
                    setLastSyncedAt(new Date());
                    dispatchSyncEvent({ type: "RUN_SUCCESS" });
                    return;
                }
                dispatchSyncEvent({ type: "RUN_FAILURE", error: failureReason });
            } finally {
                runInFlightRef.current = false;
            }
        };

        void runSyncCycle();
    }, [syncState.phase]);

    // Auto-sync loop
    useEffect(() => {
        syncManagerRef.current = syncManager;
        dispatchSyncEvent({ type: "RESET" });

        if (syncIntervalRef.current !== null) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }

        if (syncManager) {
            requestSync("startup");
            syncIntervalRef.current = window.setInterval(() => {
                requestSync("interval");
            }, 5 * 60 * 1000);
        }

        return () => {
            if (syncIntervalRef.current !== null) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [requestSync, syncManager]);

    return (
        <SyncContext.Provider value={{ syncManager, isSyncing, lastSyncedAt, accountKey, syncNow }}>
            {children}
            <ConflictResolutionDialog
                open={conflictDialogOpen}
                onMerge={handleMerge}
                onReplace={handleReplace}
                onCancel={handleCancel}
            />
        </SyncContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSync() {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error("useSync must be used within a SyncProvider");
    }
    return context;
}
