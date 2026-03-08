"use client";

/**
 * useFinishWorkout — Custom hook integrador del flujo final de guardado.
 *
 * Encapsula:
 * 1. Construcción del IWorkoutLog desde el estado del store.
 * 2. Llamada a la Server Action finalizeWorkoutSession.
 * 3. Manejo de respuesta (reset + redirect o error).
 * 4. Detección de nuevos PRs.
 *
 * Se dispara en dos escenarios:
 * A) finishWorkout sin pesos pendientes → guardar inmediatamente.
 * B) Último peso confirmado en el modal → pendingWeightUpdates vacío → guardar.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";
import { finalizeWorkoutSession } from "@/app/actions/workoutActions";
import type { IWorkoutLog } from "@/core/domain/workout-log";

export function useFinishWorkout() {
    const router = useRouter();

    const activeTemplate = useWorkoutStore((s) => s.activeTemplate);
    const currentLogs = useWorkoutStore((s) => s.currentLogs);
    const pendingWeightUpdates = useWorkoutStore((s) => s.pendingWeightUpdates);
    const evaluations = useWorkoutStore((s) => s.evaluations);
    const finishWorkout = useWorkoutStore((s) => s.finishWorkout);
    const resetStore = useWorkoutStore((s) => s.resetStore);

    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [newPRs, setNewPRs] = useState<string[] | null>(null);

    const hasFinished = useRef(false);

    // ─── Construir IWorkoutLog desde el store ────────────────

    const buildWorkoutLog = useCallback((): IWorkoutLog | null => {
        if (!activeTemplate) return null;

        return {
            id: crypto.randomUUID(),
            userId: activeTemplate.userId,
            templateId: activeTemplate.id,
            date: new Date().toISOString().split("T")[0],
            exercises: currentLogs.map((log) => {
                const found = activeTemplate.exercises.find(
                    (e) => e.exercise.id === log.exerciseId
                );
                return {
                    exercise: found?.exercise ?? { id: log.exerciseId, name: "Desconocido" },
                    sets: log.sets,
                };
            }),
            completedAt: new Date().toISOString(),
        };
    }, [activeTemplate, currentLogs]);

    // ─── Persistir en servidor ───────────────────────────────

    const saveToServer = useCallback(async () => {
        if (!activeTemplate || isSaving) return;

        const workoutLog = buildWorkoutLog();
        if (!workoutLog) return;

        setIsSaving(true);
        setSaveError(null);

        try {
            const result = await finalizeWorkoutSession(
                workoutLog,
                activeTemplate.exercises
            );

            if (result.success) {
                // Mostrar PRs antes de resetear
                if (result.newPRs && result.newPRs.length > 0) {
                    setNewPRs(result.newPRs);
                    // Delay redirect to show celebration
                    setTimeout(() => {
                        resetStore();
                        router.push("/dashboard");
                    }, 3000);
                } else {
                    resetStore();
                    router.push("/dashboard");
                }
            } else {
                setSaveError(result.error ?? "Error desconocido al guardar.");
            }
        } catch {
            setSaveError("Error de conexión. Verificá tu internet e intentá de nuevo.");
        } finally {
            setIsSaving(false);
        }
    }, [activeTemplate, isSaving, buildWorkoutLog, resetStore, router]);

    // ─── Disparador: click en "Finalizar Entrenamiento" ──────

    const handleFinish = useCallback(() => {
        finishWorkout();
        hasFinished.current = true;
    }, [finishWorkout]);

    // ─── Disparador reactivo: cuando pendingWeightUpdates queda vacío ─

    useEffect(() => {
        if (!hasFinished.current) return;
        if (evaluations.length === 0) return;

        if (pendingWeightUpdates.length === 0 && !isSaving) {
            saveToServer();
            hasFinished.current = false;
        }
    }, [pendingWeightUpdates, evaluations, isSaving, saveToServer]);

    return {
        handleFinish,
        isSaving,
        saveError,
        setSaveError,
        newPRs,
    };
}
