"use client";

/**
 * SyncProvider: starts the sync engine once for the authenticated area and
 * mirrors its state into `useSyncStore`. Also resolves the local user id
 * (offline-safe) and keeps it current across sign-in/sign-out.
 */

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import { getSyncEngine, resolveLocalUserId } from "@/infrastructure/sync/syncRuntime";
import { startSessionPersistence } from "@/presentation/stores/sessionPersistence";
import { refreshAuthUser } from "@/presentation/stores/useAuthStore";
import { refreshProfile } from "@/presentation/stores/useProfileStore";
import { useSyncStore } from "@/presentation/stores/useSyncStore";

export default function SyncProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const engine = getSyncEngine();
        let active = true;

        const unsubscribe = engine.subscribe((s) => {
            useSyncStore.setState({
                status: s.status,
                pendingCount: s.pendingCount,
                lastSyncedAt: s.lastSyncedAt,
            });
            // A sync may have pulled or refused the profile: re-read it.
            if (s.status !== "syncing") {
                const id = useSyncStore.getState().userId;
                if (id) void refreshProfile(id);
            }
        });

        const refreshUser = async () => {
            const id = await resolveLocalUserId();
            if (!active) return;
            useSyncStore.setState({ userId: id });
            await Promise.all([refreshAuthUser(), refreshProfile(id)]);
        };
        void refreshUser();

        const { data: authListener } = createSupabaseBrowserClient().auth.onAuthStateChange(
            (event) => {
                void refreshUser();
                if (event === "SIGNED_IN") void engine.flush();
            }
        );

        engine.start({ window, document });
        // Mirror the active workout into IndexedDB so a killed app loses nothing.
        const stopPersistence = startSessionPersistence();

        return () => {
            active = false;
            unsubscribe();
            authListener.subscription.unsubscribe();
            stopPersistence();
            engine.stop();
        };
    }, []);

    return <>{children}</>;
}
