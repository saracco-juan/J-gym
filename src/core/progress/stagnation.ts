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
 * This only flags. It never changes a routine or the overload rules, and per
 * AGENTS.md rule 1 (weight is always manual) it never proposes kilos.
 */

import type { ExerciseRef } from "../catalog/types";
import type { IExercise } from "../domain/exercises";
import type { IWorkoutLog } from "../domain/workout-log";
import { exerciseKey } from "../use-cases/detect-personal-records";
import { chronological } from "./chronological";
import type { ExerciseSession } from "./history";

/** Consecutive failed sessions that make an exercise stagnant. */
export const STAGNATION_SESSIONS = 3;

/** Spanish text of the stagnation notice. States the fact; never suggests a weight. */
export const STAGNATION_MESSAGE = `Fallaste las últimas ${STAGNATION_SESSIONS} sesiones. Revisá el peso o la técnica.`;

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
 * Same rule over one exercise's history (oldest first): the last
 * STAGNATION_SESSIONS performed sessions all failed.
 */
export function isStagnantHistory(sessions: readonly ExerciseSession[]): boolean {
    const performed = sessions.filter((s) => s.status === "completed" || s.status === "failed");
    const recent = performed.slice(-STAGNATION_SESSIONS);
    return recent.length === STAGNATION_SESSIONS && recent.every((s) => s.status === "failed");
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
