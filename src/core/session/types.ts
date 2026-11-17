/**
 * Pure session state for one workout day.
 *
 * Built from a routine day, mutated only through the session reducer and
 * turned into a log payload by evaluateSession. No framework imports.
 */

import type { ExerciseRef } from "../catalog/types";

export interface LoggedSet {
    reps: number;
    weight: number;
}

export interface SessionSet {
    setNumber: number;
    targetReps: number;
    targetWeight: number;
    /** False for sets the user added beyond the plan (or to a seed exercise). */
    planned: boolean;
    logged: LoggedSet | null;
}

/** Where a session exercise came from. */
export type ExerciseOrigin = "planned" | "added" | "replacement";

export interface SessionExercise {
    /** Unique within the session. For planned exercises, the routine exercise id. */
    key: string;
    ref: ExerciseRef;
    name: string;
    isBodyweight: boolean;
    origin: ExerciseOrigin;
    /** For replacements: key of the planned exercise they stand in for. */
    plannedExerciseId?: string;
    /** For a replaced planned exercise: key of its replacement. */
    replacedBy: string | null;
    skipped: boolean;
    sets: SessionSet[];
}

export interface SessionState {
    exercises: SessionExercise[];
}

/** Identity of an exercise being added to or swapped into a session. */
export interface ExerciseDescriptor {
    ref: ExerciseRef;
    name: string;
    isBodyweight: boolean;
}
