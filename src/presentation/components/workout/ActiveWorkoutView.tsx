"use client";

/**
 * ActiveWorkoutView — Main container of the workout session.
 *
 * Reads the session from the store (backed by the local database):
 * - none      -> tries to restore a persisted session, else empty state
 * - session   -> ExerciseCards + finish button
 *
 * PRs come from the local logs, so everything works offline.
 */

import { useState, useEffect } from "react";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";
import { useSyncStore } from "@/presentation/stores/useSyncStore";
import ExerciseCard from "./ExerciseCard";
import ExercisePicker from "./ExercisePicker";
import FinishConfirmDialog from "./FinishConfirmDialog";
import WeightInputModal from "./WeightInputModal";
import { useFinishWorkout } from "./useFinishWorkout";
import { Dumbbell, Plus, Trophy } from "lucide-react";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { loadPersonalBests } from "@/infrastructure/local/queries";
import { countUnloggedExercises, type ExerciseDescriptor } from "@/core/session";

export default function ActiveWorkoutView() {
    const session = useWorkoutStore((s) => s.session);
    const routine = useWorkoutStore((s) => s.routine);
    const dispatch = useWorkoutStore((s) => s.dispatch);
    const restoreWorkout = useWorkoutStore((s) => s.restoreWorkout);
    const userId = useSyncStore((s) => s.userId);
    const { handleFinish, isSaving, saveError, setSaveError, newPRs } = useFinishWorkout();
    const [prs, setPrs] = useState<Record<string, number>>({});
    const [isRestoring, setIsRestoring] = useState(true);
    const [confirmingFinish, setConfirmingFinish] = useState(false);
    /** Exercise picker: adding at the end, or replacing the exercise with this key. */
    const [picker, setPicker] = useState<{ mode: "add" } | { mode: "replace"; key: string } | null>(null);

    // ─── Restore a persisted session (app killed or reloaded) ─

    useEffect(() => {
        if (userId === undefined) return;
        if (session || !userId) {
            setIsRestoring(false);
            return;
        }
        let cancelled = false;
        restoreWorkout(userId)
            .catch(() => false)
            .finally(() => {
                if (!cancelled) setIsRestoring(false);
            });
        return () => {
            cancelled = true;
        };
        // Only when the user id resolves: a session started elsewhere must not be re-restored.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // ─── Load PRs from the local logs ─────────────────────────

    const hasSession = session !== null;
    useEffect(() => {
        if (!hasSession || !userId) return;
        let cancelled = false;
        loadPersonalBests(getLocalRepositories(), userId)
            .then((bests) => {
                if (!cancelled) setPrs(bests);
            })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [hasSession, userId]);

    // ─── Loading / empty state ────────────────────────────────

    if (!session && isRestoring) {
        return (
            <div className="flex items-center justify-center py-32">
                <span className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl">
                    <Dumbbell size={28} className="text-zinc-400" />
                </div>
                <h2 className="text-lg font-bold text-white text-center">
                    Sin entrenamiento activo
                </h2>
                <p className="text-sm text-zinc-500 text-center max-w-xs">
                    Seleccioná una rutina desde el calendario para comenzar tu sesión.
                </p>
            </div>
        );
    }

    // ─── Active session ───────────────────────────────────────

    const visible = session.exercises.filter((e) => e.replacedBy === null);
    const unloggedCount = countUnloggedExercises(session);

    const requestFinish = () => {
        if (unloggedCount > 0) setConfirmingFinish(true);
        else handleFinish();
    };

    const handlePick = (exercise: ExerciseDescriptor) => {
        if (picker?.mode === "replace") {
            dispatch({
                type: "replaceExercise",
                exerciseKey: picker.key,
                newKey: crypto.randomUUID(),
                exercise,
            });
        } else if (picker?.mode === "add") {
            dispatch({ type: "addExercise", key: crypto.randomUUID(), exercise });
        }
        setPicker(null);
    };

    const pickerTarget =
        picker?.mode === "replace" ? session.exercises.find((e) => e.key === picker.key) : undefined;

    const nameOf = (key?: string) => session.exercises.find((e) => e.key === key)?.name;

    return (
        <div className="flex flex-col gap-4 pb-28">
            {/* Header */}
            <div className="px-4 pt-4">
                <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                    Entrenamiento activo
                </p>
                <h1 className="text-2xl font-bold text-white mt-1">
                    {routine?.dayName ?? ""}
                </h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                    {visible.length} ejercicio{visible.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* New PR celebration */}
            {newPRs && newPRs.length > 0 && (
                <div className="mx-4 rounded-xl bg-yellow-900/30 border border-yellow-700/50 px-4 py-3">
                    <p className="text-sm font-bold text-yellow-300">
                        <Trophy size={16} className="inline mr-1" /> Nuevo{newPRs.length > 1 ? "s" : ""} Récord Personal!
                    </p>
                    <p className="text-xs text-yellow-400/80 mt-1">
                        {newPRs.join(", ")}
                    </p>
                </div>
            )}

            {/* Save error */}
            {saveError && (
                <div className="mx-4 flex items-center gap-3 rounded-xl bg-red-900/30 border border-red-700/50 px-4 py-3">
                    <span className="text-sm text-red-300 flex-1">{saveError}</span>
                    <button
                        onClick={() => setSaveError(null)}
                        className="text-xs font-semibold text-red-400 hover:text-red-300 shrink-0"
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {/* Exercise list */}
            <div className="flex flex-col gap-3 px-4">
                {visible.map((exercise) => (
                    <ExerciseCard
                        key={exercise.key}
                        exercise={exercise}
                        replacesName={nameOf(exercise.plannedExerciseId)}
                        personalRecord={prs[exercise.ref.id]}
                        onCompleteSet={(setNumber) =>
                            dispatch({ type: "completeSetAsPlanned", exerciseKey: exercise.key, setNumber })
                        }
                        onClearSet={(setNumber) =>
                            dispatch({ type: "clearSet", exerciseKey: exercise.key, setNumber })
                        }
                        onLogSet={(setNumber, reps, weight) =>
                            dispatch({ type: "logSet", exerciseKey: exercise.key, setNumber, reps, weight })
                        }
                        onCompleteAll={() =>
                            dispatch({ type: "completeAllAsPlanned", exerciseKey: exercise.key })
                        }
                        onSkip={() => dispatch({ type: "skipExercise", exerciseKey: exercise.key })}
                        onReplace={
                            exercise.origin === "added"
                                ? undefined
                                : () => setPicker({ mode: "replace", key: exercise.key })
                        }
                    />
                ))}

                <button
                    type="button"
                    onClick={() => setPicker({ mode: "add" })}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 active:scale-[0.98]"
                    aria-label="Agregar ejercicio"
                >
                    <Plus size={16} /> Agregar ejercicio
                </button>
            </div>

            {/* Finish button (fixed bottom) */}
            <div className="fixed bottom-0 left-0 right-0 z-30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">
                <button
                    onClick={requestFinish}
                    disabled={isSaving}
                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white text-base transition-all shadow-lg shadow-emerald-900/30 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {isSaving ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                            Guardando...
                        </span>
                    ) : (
                        "Finalizar Entrenamiento"
                    )}
                </button>
            </div>

            {picker && (
                <ExercisePicker
                    mode={picker.mode}
                    exclude={pickerTarget ? [pickerTarget.ref] : undefined}
                    onSelect={handlePick}
                    onClose={() => setPicker(null)}
                />
            )}

            {confirmingFinish && (
                <FinishConfirmDialog
                    unloggedCount={unloggedCount}
                    onConfirm={() => {
                        setConfirmingFinish(false);
                        handleFinish();
                    }}
                    onCancel={() => setConfirmingFinish(false)}
                />
            )}

            {/* Weight modal (conditional, after evaluation) */}
            <WeightInputModal />
        </div>
    );
}
