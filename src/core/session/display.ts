/**
 * Display helpers for the workout screen: pure formatting and input parsing.
 * User-facing strings are Spanish; no framework imports.
 */

import type { ExerciseLogStatus } from "../domain/log-status";
import { deriveExerciseStatus } from "./derive-exercise-status";
import type { SessionExercise, SessionState } from "./types";

export type StatusTone = "success" | "warning" | "muted" | "info";

export interface StatusLabel {
    label: string;
    tone: StatusTone;
}

/** 20 -> "20", 22.5 -> "22.5". */
export function formatWeight(weight: number): string {
    return String(Math.round(weight * 100) / 100);
}

function formatLoad(weight: number, isBodyweight: boolean): string {
    if (isBodyweight) return weight > 0 ? `+${formatWeight(weight)}kg` : "peso corporal";
    return `${formatWeight(weight)}kg`;
}

/** One set, e.g. "8 × 20kg" or "10 × +10kg". */
export function formatSetValue(reps: number, weight: number, isBodyweight: boolean): string {
    return `${reps} × ${formatLoad(weight, isBodyweight)}`;
}

/** Exercise scheme from the first planned set, e.g. "4×8 · 20kg". */
export function formatExerciseScheme(exercise: SessionExercise): string {
    const planned = exercise.sets.filter((s) => s.planned);
    if (planned.length === 0) return "Sin series";
    const first = planned[0];
    if (first.targetReps <= 0 && first.targetWeight <= 0) return "Sin objetivo";
    const load = exercise.isBodyweight
        ? first.targetWeight > 0
            ? `${formatLoad(first.targetWeight, true)} lastre`
            : "peso corporal"
        : formatLoad(first.targetWeight, false);
    return `${planned.length}×${first.targetReps} · ${load}`;
}

const STATUS_LABELS: Record<ExerciseLogStatus, StatusLabel> = {
    completed: { label: "Completado", tone: "success" },
    failed: { label: "Incompleto", tone: "warning" },
    skipped: { label: "Salteado", tone: "muted" },
    replaced: { label: "Reemplazado", tone: "muted" },
    added: { label: "Agregado", tone: "info" },
};

export function exerciseStatusLabel(status: ExerciseLogStatus): StatusLabel {
    return STATUS_LABELS[status];
}

/**
 * Status badge for an exercise card, or null while the exercise is untouched
 * (nothing logged and not skipped on purpose), so fresh cards stay clean.
 */
export function exerciseCardStatus(exercise: SessionExercise): StatusLabel | null {
    const touched = exercise.skipped || exercise.sets.some((s) => s.logged !== null);
    if (!touched) return null;
    return exerciseStatusLabel(deriveExerciseStatus(exercise));
}

/**
 * Visible exercises (not swapped out) with nothing logged that the user did
 * not skip on purpose. Finishing saves them as skipped.
 */
export function countUnloggedExercises(state: SessionState): number {
    return state.exercises.filter(
        (e) => e.replacedBy === null && !e.skipped && e.sets.every((s) => s.logged === null)
    ).length;
}

/** For bodyweight lifts the weight is optional added load ("lastre"). */
export function weightFieldLabel(isBodyweight: boolean): string {
    return isBodyweight ? "Lastre (kg)" : "Peso (kg)";
}

/**
 * Parses the typed reps and weight of a set. Returns null when invalid.
 * Reps must be a positive integer. Weight must be positive, except on
 * bodyweight lifts where empty or zero means "no added weight".
 */
export function parseSetInput(
    repsText: string,
    weightText: string,
    isBodyweight: boolean
): { reps: number; weight: number } | null {
    const repsRaw = repsText.trim();
    if (!/^\d+$/.test(repsRaw)) return null;
    const reps = Number(repsRaw);
    if (reps < 1) return null;

    const weightRaw = weightText.trim().replace(",", ".");
    if (weightRaw === "") return isBodyweight ? { reps, weight: 0 } : null;
    if (!/^\d+(\.\d+)?$/.test(weightRaw)) return null;
    const weight = Number(weightRaw);
    if (weight === 0 && !isBodyweight) return null;
    return { reps, weight };
}
