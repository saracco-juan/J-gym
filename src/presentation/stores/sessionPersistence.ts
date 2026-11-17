"use client";

/**
 * Mirrors the active workout session into Dexie on every reducer change
 * (debounced), and immediately when the page is hidden: iOS may kill a
 * backgrounded PWA at any moment, so the last state must already be stored.
 *
 * Writing stops while a finish is being committed (the commit removes the
 * record in its own transaction) and when there is no session.
 */

import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { useWorkoutStore } from "./useWorkoutStore";

const DEBOUNCE_MS = 300;

export function startSessionPersistence(): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const write = () => {
        timer = null;
        const { session, meta, userId, isFinalizing } = useWorkoutStore.getState();
        if (!session || !meta || !userId || isFinalizing) return;
        getLocalRepositories()
            .activeSession.put(userId, session, meta)
            .catch(() => {
                // Storage failure must never break the workout screen.
            });
    };

    const schedule = () => {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(write, DEBOUNCE_MS);
    };

    const flushNow = () => {
        if (timer === null) return;
        clearTimeout(timer);
        write();
    };

    const unsubscribe = useWorkoutStore.subscribe((state, prev) => {
        if (state.session !== prev.session && state.session !== null) schedule();
    });
    const onVisibility = () => {
        if (document.visibilityState === "hidden") flushNow();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushNow);

    return () => {
        flushNow();
        unsubscribe();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pagehide", flushNow);
    };
}
