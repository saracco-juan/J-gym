/**
 * Builders for the stats tests. Not part of the shipped code.
 */

import type { IRoutineTemplate, IWorkoutLog } from "../../domain";
import type { ExerciseLogStatus } from "../../domain/log-status";
import type { IWorkoutExercise } from "../../domain/workout-log";

export const USER = "u1";

/** The seed week: Monday to Thursday trained, Friday to Sunday rest. */
export const SEED_DAYS = ["lunes", "martes", "miércoles", "jueves"] as const;

export function template(dayName: string, exerciseCount = 1): IRoutineTemplate {
    return {
        id: `t-${dayName}`,
        userId: USER,
        dayName,
        exercises: Array.from({ length: exerciseCount }, (_, i) => ({
            exercise: { id: `e${i}`, name: `Ejercicio ${i}` },
            sets: [{ setNumber: 1, targetReps: 8, targetWeight: 0 }],
        })),
    };
}

export function seedTemplates(days: readonly string[] = SEED_DAYS): IRoutineTemplate[] {
    return days.map((d) => template(d));
}

export interface ExerciseOptions {
    status?: ExerciseLogStatus;
    /** Catalog id; sets the ref. */
    id?: string;
    name?: string;
}

/** `sets` are [reps, weight] pairs. */
export function exercise(
    sets: ReadonlyArray<readonly [number, number]>,
    options: ExerciseOptions = {}
): IWorkoutExercise {
    const { status, id = "bench-press", name = "Press banca" } = options;
    return {
        exercise: { id: `row-${id}`, name },
        ref: { source: "catalog", id },
        ...(status ? { status } : {}),
        sets: sets.map(([actualReps, actualWeight], i) => ({
            setNumber: i + 1,
            actualReps,
            actualWeight,
        })),
    };
}

/** An entry without ref, like the logs written before the catalog existed. */
export function legacyExercise(
    name: string,
    sets: ReadonlyArray<readonly [number, number]>,
    status?: ExerciseLogStatus
): IWorkoutExercise {
    return {
        exercise: { id: `legacy-${name}`, name },
        ...(status ? { status } : {}),
        sets: sets.map(([actualReps, actualWeight], i) => ({
            setNumber: i + 1,
            actualReps,
            actualWeight,
        })),
    };
}

let logSeq = 0;

export function log(date: string, exercises: IWorkoutExercise[], id?: string): IWorkoutLog {
    return {
        id: id ?? `log-${date}-${++logSeq}`,
        userId: USER,
        templateId: "t",
        date,
        exercises,
        completedAt: null,
    };
}

/** A log with `setCount` logged sets of the same lift. */
export function trainedLog(date: string, setCount = 3): IWorkoutLog {
    return log(date, [exercise(Array.from({ length: setCount }, () => [10, 20] as const))]);
}

/** A log whose exercises have no logged set (a skipped session). */
export function emptyLog(date: string): IWorkoutLog {
    return log(date, [exercise([], { status: "skipped" })]);
}
