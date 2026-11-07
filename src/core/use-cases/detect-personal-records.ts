/**
 * detectPersonalRecords — Pure comparison of a finished session against
 * the user's previous best weights.
 *
 * An exercise is a PR when its heaviest set is strictly above the previous
 * best (0 when there is none) and above zero.
 */

import type { IWorkoutExercise } from "../domain/workout-log";

export function detectPersonalRecords(
    exercises: IWorkoutExercise[],
    previousBests: ReadonlyMap<string, number>
): string[] {
    const records: string[] = [];
    for (const ex of exercises) {
        const previousBest = previousBests.get(ex.exercise.name) ?? 0;
        const todayMax = Math.max(...ex.sets.map((s) => s.actualWeight), 0);
        if (todayMax > previousBest && todayMax > 0) {
            records.push(ex.exercise.name);
        }
    }
    return records;
}
