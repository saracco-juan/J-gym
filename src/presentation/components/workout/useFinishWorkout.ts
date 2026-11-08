"use client";

/**
 * useFinishWorkout — Hook that orchestrates the final save.
 *
 * Flow (everything local, so it works in airplane mode):
 * 1. finishWorkout() evaluates the session (pure) and, when an exercise
 *    earned a weight increase, opens the manual weight modal.
 * 2. Once no weights are pending: evaluate -> save log -> apply overload to
 *    the local routine -> clear the active session, in one local transaction
 *    that also queues both writes for sync.
 * 3. Show new personal records, reset the store and go back to the dashboard.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { StandardHypertrophyStrategy } from "@/core/strategies";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { finishWorkoutLocally } from "@/infrastructure/local/queries";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";

const strategy = new StandardHypertrophyStrategy();

export function useFinishWorkout() {
    const router = useRouter();

    const pendingWeightUpdates = useWorkoutStore((s) => s.pendingWeightUpdates);
    const evaluation = useWorkoutStore((s) => s.evaluation);
    const finishWorkout = useWorkoutStore((s) => s.finishWorkout);

    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [newPRs, setNewPRs] = useState<string[] | null>(null);

    const hasFinished = useRef(false);

    const saveLocally = useCallback(async () => {
        const { session, meta, userId, weightOverrides, setFinalizing, resetStore } =
            useWorkoutStore.getState();
        if (!session || !meta || !userId || isSaving) return;

        setIsSaving(true);
        setSaveError(null);
        setFinalizing(true);

        try {
            const result = await finishWorkoutLocally(getLocalRepositories(), {
                userId,
                routineId: meta.templateId,
                state: session,
                logId: meta.logId,
                date: meta.date,
                completedAtIso: new Date().toISOString(),
                strategy,
                weightOverrides,
            });

            if (result.newPRs.length > 0) {
                setNewPRs(result.newPRs);
                // Delay the redirect to show the celebration.
                setTimeout(() => {
                    resetStore();
                    router.push("/dashboard");
                }, 3000);
            } else {
                resetStore();
                router.push("/dashboard");
            }
        } catch {
            setFinalizing(false);
            setSaveError("No se pudo guardar el entrenamiento en el dispositivo. Intentá de nuevo.");
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, router]);

    // Click on "Finalizar Entrenamiento".
    const handleFinish = useCallback(() => {
        finishWorkout();
        hasFinished.current = true;
    }, [finishWorkout]);

    // Reactive trigger: nothing left waiting for a manual weight.
    useEffect(() => {
        if (!hasFinished.current) return;
        if (!evaluation) return;

        if (pendingWeightUpdates.length === 0 && !isSaving) {
            hasFinished.current = false;
            void saveLocally();
        }
    }, [pendingWeightUpdates, evaluation, isSaving, saveLocally]);

    return {
        handleFinish,
        isSaving,
        saveError,
        setSaveError,
        newPRs,
    };
}
