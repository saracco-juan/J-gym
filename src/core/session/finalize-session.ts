/**
 * Pure finalize pipeline: evaluate the session, build the log, apply the
 * overload suggestions to the routine and detect personal records.
 * The caller persists the results (log and routine through the local
 * repositories, which enqueue them) and clears the active session.
 *
 * Weight is never calculated: an `increase_weight` suggestion only changes
 * the routine when the user supplied the new weight in `weightOverrides`.
 */

import type { IRoutineExercise, IRoutineTemplate } from "../domain/routine-template";
import type { IWorkoutLog } from "../domain/workout-log";
import type { IOverloadStrategy, IOverloadSuggestion } from "../strategies/overload-strategy.interface";
import { detectPersonalRecords } from "../use-cases/detect-personal-records";
import { evaluateSession, type SessionEvaluation } from "./evaluate-session";
import type { SessionState } from "./types";

export interface FinalizeInput {
    state: SessionState;
    routine: IRoutineTemplate;
    userId: string;
    logId: string;
    /** Local calendar date of the workout (YYYY-MM-DD). */
    date: string;
    completedAtIso: string;
    strategy: IOverloadStrategy;
    /** Manual new weights by planned exercise key. */
    weightOverrides: Readonly<Record<string, number>>;
    /** Personal bests before this session, keyed like `detectPersonalRecords`. */
    previousBests: ReadonlyMap<string, number>;
}

export interface FinalizeResult {
    log: IWorkoutLog;
    /** Routine with the suggestions applied, or null when nothing changed. */
    updatedRoutine: IRoutineTemplate | null;
    newPRs: string[];
}

/** Keys of planned exercises whose next weight must be typed by the user. */
export function pendingWeightKeys(evaluation: SessionEvaluation): string[] {
    return Object.entries(evaluation.suggestions)
        .filter(([, s]) => s.type === "increase_weight")
        .map(([key]) => key);
}

function applySuggestion(
    exercise: IRoutineExercise,
    suggestion: IOverloadSuggestion,
    manualWeight: number | undefined
): IRoutineExercise {
    if (suggestion.type === "increase_weight") {
        if (manualWeight === undefined) return exercise;
        return {
            ...exercise,
            sets: suggestion.nextSets.map((s) => ({ ...s, targetWeight: manualWeight })),
        };
    }
    return { ...exercise, sets: suggestion.nextSets.map((s) => ({ ...s })) };
}

export function finalizeSession(input: FinalizeInput): FinalizeResult {
    const evaluation = evaluateSession(input.state, input.strategy);

    const log: IWorkoutLog = {
        id: input.logId,
        userId: input.userId,
        templateId: input.routine.id,
        date: input.date,
        exercises: evaluation.exercises,
        completedAt: input.completedAtIso,
    };

    let changed = false;
    const exercises = input.routine.exercises.map((exercise) => {
        const suggestion = evaluation.suggestions[exercise.exercise.id];
        if (!suggestion) return exercise;
        const next = applySuggestion(exercise, suggestion, input.weightOverrides[exercise.exercise.id]);
        if (next !== exercise) changed = true;
        return next;
    });

    return {
        log,
        updatedRoutine: changed ? { ...input.routine, exercises } : null,
        newPRs: detectPersonalRecords(evaluation.exercises, input.previousBests),
    };
}
