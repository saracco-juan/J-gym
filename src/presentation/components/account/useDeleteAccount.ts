"use client";

/**
 * useDeleteAccount: flow of the "Eliminar cuenta" sheet. The pure rules decide
 * whether the destructive button is armed; on success the device is wiped and
 * the app leaves for the login screen with a notice.
 */

import { useCallback, useState } from "react";
import { deleteAccountBlock, type DeleteAccountBlock } from "@/core/account";
import { deleteOwnAccount } from "@/infrastructure/account/deleteAccount";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";
import { useOnline } from "./useOnline";

const ERRORS = {
    network: "Sin conexión. Conectate a internet para eliminar tu cuenta.",
    auth: "Tu sesión venció. Cerrá sesión, volvé a entrar e intentá de nuevo.",
    failed: "No pudimos eliminar tu cuenta. Probá de nuevo en un momento.",
} as const;

export function useDeleteAccount() {
    const online = useOnline();
    const [isOpen, setIsOpen] = useState(false);
    const [typed, setTyped] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const block: DeleteAccountBlock | null = deleteAccountBlock({ online, typed });

    const start = useCallback(() => {
        setTyped("");
        setError(null);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => setIsOpen(false), []);

    const confirm = useCallback(async () => {
        if (block !== null || busy) return;
        setBusy(true);
        setError(null);
        const result = await deleteOwnAccount(() => useWorkoutStore.getState().resetStore());
        if (result.ok) {
            // A full navigation leaves no in-memory state behind and cannot lose a
            // race against the dashboard redirect that fires once the session is gone.
            window.location.replace("/login?deleted=1");
            return;
        }
        setError(ERRORS[result.reason]);
        setBusy(false);
    }, [block, busy]);

    return { isOpen, typed, setTyped, busy, error, online, block, start, close, confirm };
}

export type DeleteAccountFlow = ReturnType<typeof useDeleteAccount>;
