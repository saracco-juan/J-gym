/**
 * RoutineTemplate — "El Futuro / El Plan"
 *
 * Plantilla de la rutina que contiene los ejercicios planeados,
 * series objetivo, repeticiones objetivo y último peso conocido.
 * Solo se actualiza tras una evaluación de sobrecarga progresiva exitosa.
 */

import type { IExercise, ISetPlan } from "./exercises";

/** Un ejercicio dentro de la plantilla con sus series planeadas. */
export interface IRoutineExercise {
    exercise: IExercise;
    sets: ISetPlan[];
}

/** Plantilla completa de un día de entrenamiento. */
export interface IRoutineTemplate {
    id: string;
    userId: string;
    dayName: string;
    exercises: IRoutineExercise[];
}
