import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useGoogleAuth } from "../auth/GoogleAuthProvider";
import { GoogleDriveService } from "./googleDriveService";
import { SyncManager } from "./syncManager";

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
    const [syncManager, setSyncManager] = useState<SyncManager | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
    const [pendingSyncManager, setPendingSyncManager] = useState<SyncManager | null>(null);
    const [accountKey, setAccountKey] = useState<string | null>(null);
    const [pendingAccountKey, setPendingAccountKey] = useState<string | null>(null);
    const syncIntervalRef = useRef<number | null>(null);
    const isSyncingRef = useRef(false);

    useEffect(() => {
        const initSync = async () => {
            if (isAuthenticated && token) {
                const driveService = new GoogleDriveService(token);
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
    }, [isAuthenticated, token]);

    const handleMerge = async () => {
        if (pendingSyncManager) {
            setSyncManager(pendingSyncManager);
            setAccountKey(pendingAccountKey);
            if (pendingAccountKey) {
                localStorage.setItem("last_synced_account", pendingAccountKey);
            }
            setConflictDialogOpen(false);
            setPendingSyncManager(null);
            setPendingAccountKey(null);
            // Trigger immediate sync to merge
            setTimeout(() => void syncNow(), 100);
        }
    };

    const handleReplace = async () => {
        if (pendingSyncManager) {
            // Wipe local data
            await appDb.transaction(
                "rw",
                [appDb.transcriptions, appDb.segments, appDb.audioChunks, appDb.videoChunks, appDb.searchIndexes],
                async () => {
                    await appDb.transcriptions.clear();
                    await appDb.segments.clear();
                    await appDb.audioChunks.clear();
                    await appDb.videoChunks.clear();
                    await appDb.searchIndexes.clear();
                }
            );

            setSyncManager(pendingSyncManager);
            setAccountKey(pendingAccountKey);
            if (pendingAccountKey) {
                localStorage.setItem("last_synced_account", pendingAccountKey);
            }
            setConflictDialogOpen(false);
            setPendingSyncManager(null);
            setPendingAccountKey(null);
            // Trigger immediate sync to download new data
            setTimeout(() => void syncNow(), 100);
        }
    };

    const handleCancel = () => {
        setConflictDialogOpen(false);
        setPendingSyncManager(null);
        setPendingAccountKey(null);
        signOut(); // Disconnect the conflicting account
    };

    const syncNow = useCallback(async () => {
        if (!syncManager || isSyncingRef.current) return;

        isSyncingRef.current = true;
        setIsSyncing(true);
        try {
            await syncManager.pullUpdates();
            await syncManager.pushUpdates();
            setLastSyncedAt(new Date());
        } catch (error) {
            console.error("Sync failed:", error);
        } finally {
            setIsSyncing(false);
            isSyncingRef.current = false;
        }
    }, [syncManager]);

    // Auto-sync loop
    useEffect(() => {
        if (syncManager) {
            // Initial sync
            void syncNow();

            // Periodic sync every 5 minutes
            syncIntervalRef.current = window.setInterval(() => {
                void syncNow();
            }, 5 * 60 * 1000);
        }

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [syncManager, syncNow]);

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
