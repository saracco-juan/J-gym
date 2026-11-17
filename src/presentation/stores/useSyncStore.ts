"use client";

/**
 * Sync state exposed to the UI. Written by SyncProvider, read by SyncBadge
 * and by screens that need the local user id.
 *
 * `userId`: undefined while resolving, null when signed out.
 */

import { create } from "zustand";
import type { SyncStatus } from "@/infrastructure/sync/SyncEngine";

interface SyncStoreState {
    userId: string | null | undefined;
    status: SyncStatus;
    pendingCount: number;
    lastSyncedAt: number | null;
}

export const useSyncStore = create<SyncStoreState>()(() => ({
    userId: undefined,
    status: "idle",
    pendingCount: 0,
    lastSyncedAt: null,
}));
