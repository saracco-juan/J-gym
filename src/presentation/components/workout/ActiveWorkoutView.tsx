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
import Link from "next/link";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";
import { useSyncStore } from "@/presentation/stores/useSyncStore";
import ExerciseCard from "./ExerciseCard";
import ExercisePicker from "./ExercisePicker";
import FinishConfirmDialog from "./FinishConfirmDialog";
import TipsSheet from "./TipsSheet";
import WeightInputModal from "./WeightInputModal";
import WorkoutSkeleton from "./WorkoutSkeleton";
import { useFinishWorkout } from "./useFinishWorkout";
import { Barbell, Plus, Trophy } from "@phosphor-icons/react";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { loadPersonalBests } from "@/infrastructure/local/queries";
import { getCatalogExercise, type ExerciseRef } from "@/core/catalog";
import { countUnloggedExercises, type ExerciseDescriptor } from "@/core/session";

/** Technique tips exist only for catalog exercises. */
function tipsFor(ref: ExerciseRef): readonly string[] | null {
    if (ref.source !== "catalog") return null;
    const tips = getCatalogExercise(ref.id)?.tipsEs;
    return tips && tips.length > 0 ? tips : null;
}

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
    const [tipsKey, setTipsKey] = useState<string | null>(null);
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
        return <WorkoutSkeleton />;
    }

    if (!session) {
        return (
            <div className="flex min-h-96 flex-col items-center justify-center gap-4 px-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-xl border border-surface-border bg-surface-raised">
                    <Barbell size={32} weight="bold" className="text-text-muted" />
                </div>
                <h2 className="title-2 text-text-primary">
                    Sin entrenamiento activo
                </h2>
                <p className="body-6 max-w-xs text-text-secondary">
                    Seleccioná una rutina desde el calendario para comenzar tu sesión.
                </p>
                <Link href="/dashboard" className="btn-primary button-md">
                    Ir al calendario
                </Link>
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

    const tipsExercise = session.exercises.find((e) => e.key === tipsKey);
    const tips = tipsExercise ? tipsFor(tipsExercise.ref) : null;

    const nameOf = (key?: string) => session.exercises.find((e) => e.key === key)?.name;

    return (
        <div className="flex flex-col gap-4 pb-24">
            {/* Header */}
            <div className="px-4 pt-4">
                <p className="caption-3 uppercase tracking-wider text-accent-text">
                    Entrenamiento activo
                </p>
                <h1 className="heading-5 mt-1 text-text-primary">
                    {routine?.dayName ?? ""}
                </h1>
                <p className="body-6 text-text-muted">
                    {visible.length} ejercicio{visible.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* New PR celebration */}
            {newPRs && newPRs.length > 0 && (
                <div role="status" className="mx-4 rounded-xl border border-warning-border bg-warning-soft px-4 py-3">
                    <p className="body-4 flex items-center gap-2 text-warning-text">
                        <Trophy size={20} weight="bold" />
                        {newPRs.length > 1 ? "Nuevos récords personales" : "Nuevo récord personal"}
                    </p>
                    <p className="caption-5 mt-1 text-text-secondary">
                        {newPRs.join(", ")}
                    </p>
                </div>
            )}

            {/* Save error */}
            {saveError && (
                <div role="alert" className="mx-4 flex items-center gap-3 rounded-xl border border-danger-border bg-danger-soft px-4 py-3">
                    <span className="body-6 flex-1 text-danger-text">{saveError}</span>
                    <button
                        type="button"
                        onClick={() => setSaveError(null)}
                        className="pressable button-sm min-h-12 shrink-0 rounded-lg px-3 py-2 text-danger-text hover:bg-danger-soft"
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
                        onShowTips={tipsFor(exercise.ref) ? () => setTipsKey(exercise.key) : undefined}
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
                    className="btn-dashed button-md"
                    aria-label="Agregar ejercicio"
                >
                    <Plus size={20} weight="bold" /> Agregar ejercicio
                </button>
            </div>

            {/* Finish button (fixed bottom) */}
            <div className="fixed inset-x-0 bottom-0 z-30 bg-surface-base/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
                <button
                    type="button"
                    onClick={requestFinish}
                    disabled={isSaving}
                    aria-busy={isSaving}
                    className="btn-primary w-full button-md"
                >
                    {isSaving ? "Guardando…" : "Finalizar entrenamiento"}
                </button>
            </div>

            {tipsExercise && tips && (
                <TipsSheet
                    exerciseName={tipsExercise.name}
                    tips={tips}
                    onClose={() => setTipsKey(null)}
                />
            )}

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
