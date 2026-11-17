/**
 * Rules for resetting the user's data while keeping the account. Pure.
 */

export interface WorkoutInProgressInput {
    /** The workout store holds a live session. */
    storeHasSession: boolean;
    /** Start date (YYYY-MM-DD) of the session saved on the device, if any. */
    savedSessionDate: string | null;
    /** Local calendar date, YYYY-MM-DD. */
    today: string;
}

/**
 * A saved session only counts when it started today: an older one is stale
 * (the dashboard does not offer to resume it either).
 */
export function isWorkoutInProgress({
    storeHasSession,
    savedSessionDate,
    today,
}: WorkoutInProgressInput): boolean {
    return storeHasSession || savedSessionDate === today;
}

export type ResetDataBlock = "workout-in-progress";

export function resetDataBlock({
    workoutInProgress,
}: {
    workoutInProgress: boolean;
}): ResetDataBlock | null {
    return workoutInProgress ? "workout-in-progress" : null;
}
