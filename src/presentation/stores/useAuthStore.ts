"use client";

/**
 * Auth user mirrored for the UI (written by SyncProvider and by the email
 * linking flow). `undefined` while resolving, `null` when signed out.
 */

import { create } from "zustand";
import { readSessionUser, type SessionUser } from "@/infrastructure/auth/sessionUser";

interface AuthStoreState {
    user: SessionUser | null | undefined;
}

export const useAuthStore = create<AuthStoreState>()(() => ({ user: undefined }));

/** Re-reads the local session into the store. */
export async function refreshAuthUser(): Promise<void> {
    useAuthStore.setState({ user: await readSessionUser() });
}
