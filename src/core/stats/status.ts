/**
 * Training status shown next to a user. Pure. Priority, first match wins:
 * inactive, stagnant, progressing, steady.
 */

import type { IWorkoutLog } from "../domain";
import { findStagnantExercises } from "../progress";
import { daysBetween } from "./dates";
import { isTrainedLog } from "./training-days";

export type TrainingStatus = "inactive" | "stagnant" | "progressing" | "steady";

export const TRAINING_STATUSES: readonly TrainingStatus[] = [
    "inactive",
    "stagnant",
    "progressing",
    "steady",
];

/** Days without a trained log after which the user counts as inactive. */
export const INACTIVE_AFTER_DAYS = 7;

/**
 * - inactive: no trained log in the last 7 days (today and the 6 before).
 * - stagnant: any exercise failed its last sessions (`findStagnantExercises`).
 * - progressing: `improvedThisMonth` (see `computeMonthlyProgress`).
 * - steady: none of the above.
 */
export function computeStatus(
    logs: readonly IWorkoutLog[],
    today: string,
    improvedThisMonth: boolean
): TrainingStatus {
    const recent = logs
        .filter((l) => isTrainedLog(l) && l.date <= today)
        .map((l) => l.date)
        .sort()
        .pop();
    if (recent === undefined || daysBetween(recent, today) >= INACTIVE_AFTER_DAYS) return "inactive";
    if (findStagnantExercises(logs).size > 0) return "stagnant";
    return improvedThisMonth ? "progressing" : "steady";
}
