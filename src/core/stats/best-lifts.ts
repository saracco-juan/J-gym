/**
 * Best weight ever on the lifts the leaderboard shows. Pure.
 *
 * Lifts are matched with the same key space as personal records (catalog ref
 * id, else the catalog id a legacy name resolves to), through the exercise
 * history. This only reports what was lifted; it never proposes a weight.
 */

import { buildExerciseHistory, findPersonalRecord } from "../progress";
import type { IWorkoutLog } from "../domain";

export const TRACKED_LIFTS = ["back-squat", "bench-press", "lat-pulldown"] as const;

export type TrackedLift = (typeof TRACKED_LIFTS)[number];

export interface BestLift {
    weight: number;
    /** Reps of the set that holds the best weight. */
    reps: number;
}

export type BestLifts = Record<TrackedLift, BestLift | null>;

/**
 * Per lift, the heaviest set ever with its reps (ties go to the earliest
 * session, like `findPersonalRecord`). Null when it was never logged with a
 * weight.
 */
export function computeBestLifts(logs: readonly IWorkoutLog[]): BestLifts {
    const lifts = {} as BestLifts;
    for (const lift of TRACKED_LIFTS) {
        const record = findPersonalRecord(buildExerciseHistory(logs, lift));
        lifts[lift] = record && record.weight > 0 ? { weight: record.weight, reps: record.reps } : null;
    }
    return lifts;
}
