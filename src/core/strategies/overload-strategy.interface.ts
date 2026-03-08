/**
 * Interface del Strategy Pattern para algoritmos de sobrecarga progresiva.
 *
 * Cada estrategia implementa `evaluate()` para comparar lo planeado vs lo realizado
 * y generar una sugerencia para la próxima sesión.
 */

import type { ISetPlan, ISetResult } from "../domain/exercises";

/** Tipo de resultado de la evaluación de sobrecarga. */
export type OverloadResultType = "progress" | "maintain" | "increase_weight";

/** Sugerencia generada por la estrategia de sobrecarga. */
export interface IOverloadSuggestion {
    type: OverloadResultType;
    nextSets: ISetPlan[];
    message: string;
}

/** Datos planeados de un ejercicio para la evaluación. */
export interface IPlannedExerciseData {
    sets: ISetPlan[];
}

/** Datos reales de un ejercicio para la evaluación. */
export interface IActualExerciseData {
    sets: ISetResult[];
}

/** Interface para estrategias de sobrecarga progresiva (Strategy Pattern). */
export interface IOverloadStrategy {
    evaluate(
        planned: IPlannedExerciseData,
        actual: IActualExerciseData
    ): IOverloadSuggestion;
}
