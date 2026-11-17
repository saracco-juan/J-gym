/**
 * detectPersonalRecords — Pure comparison of a finished session against
 * the user's previous best weights.
 *
 * Exercises are keyed by id (catalog id or custom UUID). Legacy logs without
 * a ref are keyed by the catalog id their name resolves to, or by the raw
 * name when it matches nothing. Previous bests may be keyed by id or by legacy
 * name; both are folded into the same key space, keeping the best.
 *
 * An exercise is a PR when its heaviest set is strictly above the previous
 * best (0 when there is none) and above zero. Each exercise is flagged once
 * per session, by the name of its first occurrence.
 */

import { resolveLegacyExerciseName } from "../catalog";
import type { IWorkoutExercise } from "../domain/workout-log";

export function exerciseKey(ex: IWorkoutExercise): string {
    return ex.ref?.id ?? resolveLegacyExerciseName(ex.exercise.name) ?? ex.exercise.name;
}

function foldPreviousBests(previousBests: ReadonlyMap<string, number>): Map<string, number> {
    const folded = new Map<string, number>();
    for (const [key, weight] of previousBests) {
        const resolved = resolveLegacyExerciseName(key) ?? key;
        folded.set(resolved, Math.max(folded.get(resolved) ?? 0, weight));
    }
    return folded;
}

export function detectPersonalRecords(
    exercises: IWorkoutExercise[],
    previousBests: ReadonlyMap<string, number>
): string[] {
    const bests = foldPreviousBests(previousBests);
    const todayMaxByKey = new Map<string, number>();
    const firstNameByKey = new Map<string, string>();

    for (const ex of exercises) {
        const key = exerciseKey(ex);
        const max = Math.max(...ex.sets.map((s) => s.actualWeight), 0);
        todayMaxByKey.set(key, Math.max(todayMaxByKey.get(key) ?? 0, max));
        if (!firstNameByKey.has(key)) firstNameByKey.set(key, ex.exercise.name);
    }

    const records: string[] = [];
    for (const [key, todayMax] of todayMaxByKey) {
        if (todayMax > (bests.get(key) ?? 0) && todayMax > 0) {
            records.push(firstNameByKey.get(key) as string);
        }
    }
    return records;
}
