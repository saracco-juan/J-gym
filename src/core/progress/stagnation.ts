/**
 * Stagnation detection. Pure: no framework or storage imports.
 *
 * An exercise is stagnant when the last STAGNATION_SESSIONS sessions in which
 * it was performed (status completed or failed) all ended failed. Skipped,
 * replaced, added and unknown (legacy) statuses say nothing about how a lift
 * went, so they are ignored and never break or extend a streak.
 *
 * Exercises are matched with the same key space as personal records: ref id,
 * else the catalog id the legacy name resolves to, else the raw name.
 *
 * This only flags and suggests. It never changes a routine or the overload
 * rules.
 */

import type { ExerciseRef } from "../catalog/types";
import type { IExercise } from "../domain/exercises";
import type { IWorkoutLog } from "../domain/workout-log";
import { formatWeight } from "../session/display";
import { exerciseKey } from "../use-cases/detect-personal-records";
import { chronological } from "./chronological";

/** Consecutive failed sessions that make an exercise stagnant. */
export const STAGNATION_SESSIONS = 3;

/** Plate step the suggested weight snaps to, in kg. */
const WEIGHT_STEP = 2.5;
/** Fraction of the weight a suggestion takes off. */
const WEIGHT_REDUCTION = 0.1;
/** Reps a suggestion takes off. */
const REPS_REDUCTION = 2;

/**
 * Keys of the exercises whose last STAGNATION_SESSIONS performed sessions all
 * failed. `logs` may come in any order.
 */
export function findStagnantExercises(logs: readonly IWorkoutLog[]): Set<string> {
    // Per exercise key: one outcome per session, oldest first (true = failed).
    const outcomes = new Map<string, boolean[]>();

    for (const log of chronological(logs)) {
        const sessionOutcome = new Map<string, boolean>();
        for (const ex of log.exercises) {
            if (ex.status !== "completed" && ex.status !== "failed") continue;
            const key = exerciseKey(ex);
            const failed = ex.status === "failed";
            // A session counts as failed only if no occurrence was completed.
            sessionOutcome.set(key, (sessionOutcome.get(key) ?? true) && failed);
        }
        for (const [key, failed] of sessionOutcome) {
            const list = outcomes.get(key) ?? [];
            list.push(failed);
            outcomes.set(key, list);
        }
    }

    const stagnant = new Set<string>();
    for (const [key, list] of outcomes) {
        const recent = list.slice(-STAGNATION_SESSIONS);
        if (recent.length === STAGNATION_SESSIONS && recent.every(Boolean)) stagnant.add(key);
    }
    return stagnant;
}

/**
 * True when the exercise, as planned or logged, is in the stagnant set.
 * Routine exercises without a ref also match by exercise id: that is the ref
 * a session gives to a free text exercise, so its logs are keyed by it.
 */
export function isExerciseStagnant(
    stagnant: ReadonlySet<string>,
    item: { exercise: IExercise; ref?: ExerciseRef }
): boolean {
    if (stagnant.has(exerciseKey(item))) return true;
    return item.ref === undefined && stagnant.has(item.exercise.id);
}

export type StagnationSuggestion =
    | { kind: "lower-weight"; from: number; to: number }
    | { kind: "fewer-reps"; from: number; to: number };

export interface StagnationSuggestionInput {
    /** Current target weight in kg (extra load for bodyweight lifts). */
    weight: number;
    /** Current target reps. */
    reps: number;
    isBodyweight: boolean;
}

function lowerWeight(weight: number): number | null {
    const snapped = Math.round((weight * (1 - WEIGHT_REDUCTION)) / WEIGHT_STEP) * WEIGHT_STEP;
    const lowered = snapped >= weight ? weight - WEIGHT_STEP : snapped;
    return lowered > 0 ? lowered : null;
}

/**
 * What to try next on a stagnant exercise: about 10% less weight rounded to
 * 2.5 kg (always at least one step lower), or fewer reps when there is no
 * weight to lower (bodyweight work, a seed routine without a weight, or a
 * weight too small to reduce). Null when nothing can be lowered.
 */
export function suggestStagnationAction(
    input: StagnationSuggestionInput
): StagnationSuggestion | null {
    const { weight, reps } = input;
    const lowered = weight > 0 ? lowerWeight(weight) : null;
    if (lowered !== null) return { kind: "lower-weight", from: weight, to: lowered };
    if (reps <= 1) return null;
    return { kind: "fewer-reps", from: reps, to: Math.max(1, reps - REPS_REDUCTION) };
}

/** Spanish wording of a suggestion, for the stagnation notice. */
export function formatStagnationSuggestion(suggestion: StagnationSuggestion): string {
    if (suggestion.kind === "lower-weight") {
        return `Prueba bajar de ${formatWeight(suggestion.from)}kg a ${formatWeight(suggestion.to)}kg para recuperar el ritmo.`;
    }
    return `Prueba bajar de ${suggestion.from} a ${suggestion.to} repeticiones para recuperar el ritmo.`;
}
