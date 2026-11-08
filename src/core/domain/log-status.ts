/**
 * Outcome of one exercise inside a finished session.
 *
 * - completed: every planned set logged and meeting its targets.
 * - failed: partially logged, or logged below target.
 * - skipped: nothing logged.
 * - replaced: planned exercise swapped for another one (no sets logged).
 * - added: exercise performed that was not in the plan; this includes the
 *   exercise that replaced a planned one.
 */
export type ExerciseLogStatus =
    | "completed"
    | "failed"
    | "skipped"
    | "replaced"
    | "added";

export const EXERCISE_LOG_STATUSES: readonly ExerciseLogStatus[] = [
    "completed",
    "failed",
    "skipped",
    "replaced",
    "added",
];
