"use client";

/**
 * useResetData: flow of the "Reiniciar datos" sheet. A workout in progress
 * blocks the reset (checked when the sheet opens, from the store and from the
 * session saved on the device). The reset itself is local and works offline;
 * the server deletes travel through the outbox.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { resetDataBlock, type ResetDataBlock } from "@/core/account";
import { toLocalDateStr } from "@/core/schedule";
import { loadWorkoutInProgress, resetOwnData } from "@/infrastructure/account/resetData";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { useAuthStore } from "@/presentation/stores/useAuthStore";
import { useSyncStore } from "@/presentation/stores/useSyncStore";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";

const ERROR = "No pudimos reiniciar tus datos. Probá de nuevo.";

export function useResetData() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [block, setBlock] = useState<ResetDataBlock | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const start = useCallback(async () => {
        const userId = useSyncStore.getState().userId;
        setError(null);
        setBlock(null);
        setIsOpen(true);
        if (!userId) return;
        const inProgress = await loadWorkoutInProgress(getLocalRepositories(), {
            userId,
            today: toLocalDateStr(new Date()),
            storeHasSession: useWorkoutStore.getState().session !== null,
        }).catch(() => false);
        setBlock(resetDataBlock({ workoutInProgress: inProgress }));
    }, []);

    const close = useCallback(() => setIsOpen(false), []);

    const confirm = useCallback(async () => {
        const userId = useSyncStore.getState().userId;
        const user = useAuthStore.getState().user;
        if (!userId || !user || block !== null || busy) return;
        setBusy(true);
        setError(null);
        try {
            await resetOwnData(getLocalRepositories(), {
                userId,
                today: toLocalDateStr(new Date()),
                registered: !user.isAnonymous,
            });
            useWorkoutStore.getState().resetStore();
            setIsOpen(false);
            router.replace("/onboarding");
        } catch {
            setError(ERROR);
        } finally {
            setBusy(false);
        }
    }, [block, busy, router]);

    return { isOpen, block, busy, error, start, close, confirm };
}

export type ResetDataFlow = ReturnType<typeof useResetData>;
