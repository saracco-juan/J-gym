/**
 * WorkoutLog — "El Pasado / La Realidad"
 *
 * Registro inmutable de una sesión de entrenamiento.
 * Contiene fecha, ejercicios, peso exacto y repeticiones exactas por serie.
 */

import type { ExerciseRef } from "../catalog/types";
import type { IExercise, ISetResult } from "./exercises";
import type { ExerciseLogStatus } from "./log-status";

/** Serie realizada en un ejercicio durante el entrenamiento. */
export type IWorkoutSet = ISetResult;

/** Un ejercicio realizado durante el entrenamiento con todas sus series. */
export interface IWorkoutExercise {
    exercise: IExercise;
    /** Catalog or custom reference. Absent on legacy logs. */
    ref?: ExerciseRef;
    /** Absent on legacy logs. */
    status?: ExerciseLogStatus;
    /** For replaced/added exercises: id of the planned exercise they relate to. */
    plannedExerciseId?: string;
    sets: IWorkoutSet[];
}

/** Log completo e inmutable de una sesión de entrenamiento. */
export interface IWorkoutLog {
    id: string;
    userId: string;
    templateId: string;
    date: string; // ISO 8601 date string
    exercises: IWorkoutExercise[];
    completedAt: string | null; // ISO 8601 datetime string
}
