"use client";

/**
 * useSignOut: sign-out flow of the profile menu. Decides whether the user
 * must confirm first (anonymous account, unsynced changes) and guarantees the
 * app always leaves for /login, even when the network call fails or hangs.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { signOutWarning, type SignOutWarning } from "@/core/auth";
import { signOutAndClear } from "@/infrastructure/sync/syncRuntime";
import { useSyncStore } from "@/presentation/stores/useSyncStore";

export function useSignOut(isAnonymous: boolean) {
    const router = useRouter();
    const [warning, setWarning] = useState<SignOutWarning | null>(null);
    const [signingOut, setSigningOut] = useState(false);

    const confirm = useCallback(async () => {
        setSigningOut(true);
        try {
            await signOutAndClear();
        } catch {
            // signOutAndClear never throws; this keeps navigation unconditional.
        } finally {
            router.replace("/login");
        }
    }, [router]);

    /**
     * Signs out right away, or asks for confirmation when something is at
     * stake. Returns true when the confirmation sheet was opened.
     */
    const request = useCallback((): boolean => {
        const pendingCount = useSyncStore.getState().pendingCount;
        const needed = signOutWarning({ isAnonymous, pendingCount });
        if (needed) {
            setWarning(needed);
            return true;
        }
        void confirm();
        return false;
    }, [isAnonymous, confirm]);

    const dismiss = useCallback(() => setWarning(null), []);

    return { warning, signingOut, request, confirm, dismiss };
}
