"use client";

/**
 * ExerciseCard — one exercise of the session.
 *
 * Presentational: receives the session exercise and callbacks, owns only the
 * UI state of the inline set editor. One tap on a set logs it as planned; the
 * editor opens on demand, and automatically when the exercise has no usable
 * targets (one tap cannot log zeros).
 */

import { useState } from "react";
import { Info, Plus, Trophy } from "lucide-react";
import {
    exerciseCardStatus,
    formatExerciseScheme,
    formatWeight,
    needsFirstInput,
    type SessionExercise,
    type SessionSet,
} from "@/core/session";
import ExerciseStatusBadge from "./ExerciseStatusBadge";
import SetEditor from "./SetEditor";
import SetRow from "./SetRow";

interface ExerciseCardProps {
    exercise: SessionExercise;
    /** Name of the planned exercise this one replaces, when it is a replacement. */
    replacesName?: string;
    personalRecord?: number;
    onCompleteSet: (setNumber: number) => void;
    onClearSet: (setNumber: number) => void;
    onLogSet: (setNumber: number, reps: number, weight: number) => void;
    onCompleteAll: () => void;
    onSkip: () => void;
    /** Hidden when absent (e.g. added exercises cannot be replaced). */
    onReplace?: () => void;
    /** Hidden when absent (custom exercises have no tips). */
    onShowTips?: () => void;
}

function firstUnlogged(sets: SessionSet[]): number {
    return sets.find((s) => s.logged === null)?.setNumber ?? sets.length + 1;
}

/** Initial editor text: logged values, else the target, else the previous set. */
function editorDefaults(sets: SessionSet[], setNumber: number): { reps: string; weight: string } {
    const set = sets.find((s) => s.setNumber === setNumber);
    if (set?.logged) {
        return { reps: String(set.logged.reps), weight: formatWeight(set.logged.weight) };
    }
    const previous = [...sets]
        .filter((s) => s.setNumber < setNumber && s.logged !== null)
        .sort((a, b) => b.setNumber - a.setNumber)[0]?.logged;
    const reps = set && set.targetReps > 0 ? set.targetReps : previous?.reps;
    const weight = set && set.targetWeight > 0 ? set.targetWeight : previous?.weight;
    return {
        reps: reps !== undefined ? String(reps) : "",
        weight: weight !== undefined && weight > 0 ? formatWeight(weight) : "",
    };
}

const SECONDARY_BUTTON =
    "flex h-11 flex-1 items-center justify-center rounded-xl border border-zinc-700 px-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 active:scale-[0.98]";

export default function ExerciseCard({
    exercise,
    replacesName,
    personalRecord,
    onCompleteSet,
    onClearSet,
    onLogSet,
    onCompleteAll,
    onSkip,
    onReplace,
    onShowTips,
}: ExerciseCardProps) {
    const [editing, setEditing] = useState<number | null>(() =>
        needsFirstInput(exercise) ? firstUnlogged(exercise.sets) : null
    );

    const { sets, isBodyweight } = exercise;
    const status = exerciseCardStatus(exercise);
    const allLogged = sets.length > 0 && sets.every((s) => s.logged !== null);
    const firstInputMode = needsFirstInput(exercise);

    const handleToggle = (set: SessionSet) => {
        if (set.logged) {
            onClearSet(set.setNumber);
        } else if (firstInputMode) {
            setEditing(set.setNumber);
        } else {
            onCompleteSet(set.setNumber);
        }
    };

    const handleCompleteAll = () => {
        if (firstInputMode) {
            setEditing(firstUnlogged(sets));
        } else {
            onCompleteAll();
        }
    };

    const handleSave = (setNumber: number, reps: number, weight: number) => {
        onLogSet(setNumber, reps, weight);
        // Without usable targets every set needs typed values: keep going.
        const next = firstInputMode
            ? sets.find((s) => s.setNumber > setNumber && s.logged === null)
            : undefined;
        setEditing(next ? next.setNumber : null);
    };

    const extraSetNumber = sets.length + 1;

    return (
        <section
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80"
            aria-label={exercise.name}
        >
            <div className="flex items-start justify-between gap-2 bg-zinc-800/50 px-4 py-3">
                <div className="min-w-0">
                    <h3 className="text-base font-bold leading-snug text-white">{exercise.name}</h3>
                    {replacesName && (
                        <p className="text-xs text-zinc-500">Reemplaza a {replacesName}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                            {formatExerciseScheme(exercise)}
                        </span>
                        {status && <ExerciseStatusBadge status={status} />}
                        {personalRecord != null && personalRecord > 0 && (
                            <span className="flex items-center gap-0.5 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800">
                                <Trophy size={11} /> PR {formatWeight(personalRecord)}kg
                            </span>
                        )}
                    </div>
                </div>
                {onShowTips && (
                    <button
                        type="button"
                        onClick={onShowTips}
                        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
                        aria-label={`Ver técnica de ${exercise.name}`}
                    >
                        <Info size={20} />
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2 p-3">
                {sets.map((set) =>
                    editing === set.setNumber ? (
                        <SetEditor
                            key={`${set.setNumber}-edit`}
                            setNumber={set.setNumber}
                            isBodyweight={isBodyweight}
                            initialReps={editorDefaults(sets, set.setNumber).reps}
                            initialWeight={editorDefaults(sets, set.setNumber).weight}
                            onSave={(reps, weight) => handleSave(set.setNumber, reps, weight)}
                            onCancel={() => setEditing(null)}
                        />
                    ) : (
                        <SetRow
                            key={set.setNumber}
                            setNumber={set.setNumber}
                            targetReps={set.targetReps}
                            targetWeight={set.targetWeight}
                            isBodyweight={isBodyweight}
                            logged={set.logged}
                            onToggle={() => handleToggle(set)}
                            onEdit={() => setEditing(set.setNumber)}
                        />
                    )
                )}

                {editing === extraSetNumber && (
                    <SetEditor
                        key={`${extraSetNumber}-edit`}
                        setNumber={extraSetNumber}
                        isBodyweight={isBodyweight}
                        initialReps={editorDefaults(sets, extraSetNumber).reps}
                        initialWeight={editorDefaults(sets, extraSetNumber).weight}
                        onSave={(reps, weight) => handleSave(extraSetNumber, reps, weight)}
                        onCancel={() => setEditing(null)}
                    />
                )}

                {!allLogged && sets.length > 0 && (
                    <button
                        type="button"
                        onClick={handleCompleteAll}
                        className="mt-1 h-12 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-500 active:scale-[0.98]"
                        aria-label={`Completar todas las series de ${exercise.name}`}
                    >
                        Completar todo
                    </button>
                )}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setEditing(extraSetNumber)}
                        className={SECONDARY_BUTTON}
                        aria-label={`Agregar serie a ${exercise.name}`}
                    >
                        <Plus size={14} className="mr-1" /> Serie
                    </button>
                    {!exercise.skipped && (
                        <button
                            type="button"
                            onClick={onSkip}
                            className={SECONDARY_BUTTON}
                            aria-label={`Saltear ${exercise.name}`}
                        >
                            Saltear
                        </button>
                    )}
                    {onReplace && (
                        <button
                            type="button"
                            onClick={onReplace}
                            className={SECONDARY_BUTTON}
                            aria-label={`Reemplazar ${exercise.name}`}
                        >
                            Reemplazar
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
