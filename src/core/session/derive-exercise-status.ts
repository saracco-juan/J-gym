import type { ExerciseLogStatus } from "../domain/log-status";
import type { SessionExercise } from "./types";

/**
 * Derives the log status of one session exercise.
 *
 * - replaced: a replacement took over the planned exercise.
 * - added: an added or replacement exercise with at least one logged set.
 * - skipped: nothing logged (explicitly skipped or never touched).
 * - completed: every planned set logged and meeting reps and weight targets.
 * - failed: anything else with logged sets; partial logging counts as failed.
 */
export function deriveExerciseStatus(exercise: SessionExercise): ExerciseLogStatus {
    if (exercise.replacedBy !== null) return "replaced";

    const hasLogged = exercise.sets.some((s) => s.logged !== null);
    if (!hasLogged) return "skipped";
    if (exercise.origin !== "planned") return "added";

    const metTargets = exercise.sets
        .filter((s) => s.planned)
        .every(
            (s) =>
                s.logged !== null &&
                s.logged.reps >= s.targetReps &&
                s.logged.weight >= s.targetWeight
        );
    return metTargets ? "completed" : "failed";
}
