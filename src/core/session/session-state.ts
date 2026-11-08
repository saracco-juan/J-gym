import { getCatalogExercise, resolveLegacyExerciseName } from "../catalog";
import type { ExerciseRef } from "../catalog/types";
import type { IRoutineExercise } from "../domain/routine-template";
import type { SessionExercise, SessionState } from "./types";

function resolveRef(item: IRoutineExercise): ExerciseRef {
    if (item.ref) return item.ref;
    const catalogId = resolveLegacyExerciseName(item.exercise.name);
    return catalogId
        ? { source: "catalog", id: catalogId }
        : { source: "custom", id: item.exercise.id };
}

function isBodyweight(ref: ExerciseRef): boolean {
    return ref.source === "catalog"
        ? (getCatalogExercise(ref.id)?.isBodyweight ?? false)
        : false;
}

/** Builds a fresh session from the exercises of a routine day. */
export function createSession(day: IRoutineExercise[]): SessionState {
    return {
        exercises: day.map((item) => {
            const ref = resolveRef(item);
            return {
                key: item.exercise.id,
                ref,
                name: item.exercise.name,
                isBodyweight: isBodyweight(ref),
                origin: "planned",
                replacedBy: null,
                skipped: false,
                sets: item.sets.map((s) => ({
                    setNumber: s.setNumber,
                    targetReps: s.targetReps,
                    targetWeight: s.targetWeight,
                    planned: true,
                    logged: null,
                })),
            };
        }),
    };
}

/**
 * True when one tap cannot log this exercise as planned: there is no planned
 * set, a target is zero reps, or a non-bodyweight target is zero weight.
 * The UI uses it to open the exercise expanded so the user types real numbers.
 */
export function needsFirstInput(exercise: SessionExercise): boolean {
    const planned = exercise.sets.filter((s) => s.planned);
    if (planned.length === 0) return true;
    return planned.some(
        (s) => s.targetReps <= 0 || (!exercise.isBodyweight && s.targetWeight <= 0)
    );
}
