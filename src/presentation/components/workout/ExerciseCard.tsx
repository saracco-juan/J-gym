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
import { Info, Plus, Trophy } from "@phosphor-icons/react";
import {
    exerciseCardStatus,
    formatExerciseScheme,
    formatWeight,
    needsFirstInput,
    type SessionExercise,
    type SessionSet,
} from "@/core/session";
import {
    formatStagnationSuggestion,
    suggestStagnationAction,
} from "@/core/progress";
import StagnationNotice from "@/presentation/components/ui/StagnationNotice";
import ExerciseStatusBadge from "./ExerciseStatusBadge";
import SetEditor from "./SetEditor";
import SetRow from "./SetRow";

interface ExerciseCardProps {
    exercise: SessionExercise;
    /** Name of the planned exercise this one replaces, when it is a replacement. */
    replacesName?: string;
    personalRecord?: number;
    /** The last three sessions of this exercise all failed. */
    stagnant?: boolean;
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

const SECONDARY_BUTTON = "btn-secondary button-sm min-w-0 flex-auto";

export default function ExerciseCard({
    exercise,
    replacesName,
    personalRecord,
    stagnant = false,
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

    const stagnationText = (() => {
        if (!stagnant) return null;
        const first = sets.find((s) => s.planned);
        const suggestion = suggestStagnationAction({
            weight: first?.targetWeight ?? 0,
            reps: first?.targetReps ?? 0,
            isBodyweight,
        });
        return suggestion ? formatStagnationSuggestion(suggestion) : null;
    })();

    return (
        <section
            className="overflow-hidden rounded-2xl border border-surface-border bg-surface-raised"
            aria-label={exercise.name}
        >
            <div className="flex items-start justify-between gap-2 bg-surface-overlay px-4 py-3">
                <div className="min-w-0">
                    <h3 className="title-2 text-text-primary">{exercise.name}</h3>
                    {replacesName && (
                        <p className="caption-5 text-text-muted">Reemplaza a {replacesName}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="caption-4 rounded-full bg-accent-soft px-2 py-0.5 text-accent-text">
                            {formatExerciseScheme(exercise)}
                        </span>
                        {status && <ExerciseStatusBadge status={status} />}
                        {personalRecord != null && personalRecord > 0 && (
                            <span className="caption-3 flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-warning-text">
                                <Trophy size={16} weight="bold" /> PR {formatWeight(personalRecord)}kg
                            </span>
                        )}
                    </div>
                    {stagnant && (
                        <div className="mt-2">
                            <StagnationNotice suggestion={stagnationText} />
                        </div>
                    )}
                </div>
                {onShowTips && (
                    <button
                        type="button"
                        onClick={onShowTips}
                        className="btn-icon -my-2 -mr-2"
                        aria-label={`Ver técnica de ${exercise.name}`}
                    >
                        <Info size={24} weight="bold" />
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2 p-4">
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
                        className="btn-primary mt-1 button-md"
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
                        <Plus size={16} weight="bold" /> Serie
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
