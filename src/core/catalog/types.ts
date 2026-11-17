/**
 * Exercise catalog and reference types.
 *
 * Pure domain types: no framework imports.
 */

export type MuscleGroup =
    | "chest"
    | "back"
    | "legs"
    | "glutes"
    | "shoulders"
    | "arms"
    | "core";

export type ExerciseType = "compound" | "isolation";

/** Static catalog entry. User-facing strings are Spanish. */
export interface CatalogExercise {
    /** Stable kebab-case slug, e.g. "back-squat". Never changes once shipped. */
    id: string;
    nameEs: string;
    muscleGroup: MuscleGroup;
    type: ExerciseType;
    /** True when the lift uses body weight (extra weight is optional). */
    isBodyweight: boolean;
    /** 2-3 short technique tips in Spanish. */
    tipsEs: string[];
    /** Legacy or colloquial names that resolve to this entry. */
    aliases?: string[];
}

/** User-created exercise that is not in the catalog. */
export interface CustomExercise {
    /** UUID. */
    id: string;
    name: string;
    muscleGroup: MuscleGroup;
    isBodyweight: boolean;
}

/** Reference to an exercise: a catalog id or a custom exercise UUID. */
export type ExerciseRef =
    | { source: "catalog"; id: string }
    | { source: "custom"; id: string };
