import type { ISetPlan, ISetResult } from "../domain/exercises";
import type { IWorkoutExercise } from "../domain/workout-log";
import { evaluateOverload } from "../use-cases/evaluate-overload";
import type { IOverloadStrategy, IOverloadSuggestion } from "../strategies/overload-strategy.interface";
import { deriveExerciseStatus } from "./derive-exercise-status";
import type { SessionExercise, SessionState } from "./types";

export interface SessionEvaluation {
    /** Log payload: one entry per exercise that was done, skipped or replaced. */
    exercises: IWorkoutExercise[];
    /** Overload suggestions keyed by the planned exercise key. */
    suggestions: Record<string, IOverloadSuggestion>;
}

function loggedResults(exercise: SessionExercise): ISetResult[] {
    return exercise.sets.flatMap((s) =>
        s.logged
            ? [{ setNumber: s.setNumber, actualReps: s.logged.reps, actualWeight: s.logged.weight }]
            : []
    );
}

/**
 * Logged sets aligned with the plan: the strategy compares by position, so
 * stop at the first unlogged set instead of letting later sets shift left.
 */
function contiguousResults(exercise: SessionExercise): ISetResult[] {
    const results: ISetResult[] = [];
    for (const s of exercise.sets) {
        if (!s.logged) break;
        results.push({ setNumber: s.setNumber, actualReps: s.logged.reps, actualWeight: s.logged.weight });
    }
    return results;
}

function plannedTargets(exercise: SessionExercise): ISetPlan[] {
    return exercise.sets
        .filter((s) => s.planned)
        .map((s) => ({
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            targetWeight: s.targetWeight,
        }));
}

/** The strategy compares reps only, so lighter-than-planned sets are checked here. */
function loggedBelowTargetWeight(exercise: SessionExercise): boolean {
    return exercise.sets.some(
        (s) => s.planned && s.logged !== null && s.logged.weight < s.targetWeight
    );
}

function maintainScheme(plannedSets: ISetPlan[]): IOverloadSuggestion {
    const reps = plannedSets[0].targetReps;
    const weight = plannedSets[0].targetWeight;
    return {
        type: "maintain",
        nextSets: plannedSets.map((s) => ({ ...s })),
        message: `Se usó menos peso del planeado. Mantener ${plannedSets.length}x${reps} con ${weight}kg.`,
    };
}

/**
 * Turns a finished session into the log payload and overload suggestions.
 *
 * Only planned exercises that ended completed or failed feed the strategy.
 * Replacement and added exercises never do: their performance stays in their
 * own history and cannot change a planned exercise's progression.
 */
export function evaluateSession(
    state: SessionState,
    strategy: IOverloadStrategy
): SessionEvaluation {
    const exercises: IWorkoutExercise[] = [];
    const suggestions: Record<string, IOverloadSuggestion> = {};

    for (const exercise of state.exercises) {
        const status = deriveExerciseStatus(exercise);
        const sets = loggedResults(exercise);

        // An added or replacement exercise nobody touched leaves no trace.
        if (exercise.origin !== "planned" && sets.length === 0) continue;

        const entry: IWorkoutExercise = {
            exercise: { id: exercise.key, name: exercise.name },
            ref: exercise.ref,
            status,
            sets,
        };
        if (exercise.plannedExerciseId !== undefined) {
            entry.plannedExerciseId = exercise.plannedExerciseId;
        }
        exercises.push(entry);

        const plannedSets = plannedTargets(exercise);
        const feedsEngine =
            exercise.origin === "planned" &&
            (status === "completed" || status === "failed") &&
            plannedSets.length > 0;
        if (feedsEngine) {
            suggestions[exercise.key] = loggedBelowTargetWeight(exercise)
                ? maintainScheme(plannedSets)
                : evaluateOverload(
                      strategy,
                      { sets: plannedSets },
                      { sets: contiguousResults(exercise) }
                  );
        }
    }

    return { exercises, suggestions };
}
