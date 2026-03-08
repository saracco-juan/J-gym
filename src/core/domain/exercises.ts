/**
 * Entidades base de ejercicios.
 *
 * - IExercise: Definición de un ejercicio (catálogo).
 * - ISetPlan: Serie planeada dentro de un RoutineTemplate.
 * - ISetResult: Serie ejecutada dentro de un WorkoutLog.
 */

export interface IExercise {
    id: string;
    name: string;
}

/** Serie objetivo dentro de la plantilla de rutina. */
export interface ISetPlan {
    setNumber: number;
    targetReps: number;
    targetWeight: number;
}

/** Serie realizada durante un entrenamiento. */
export interface ISetResult {
    setNumber: number;
    actualReps: number;
    actualWeight: number;
}
