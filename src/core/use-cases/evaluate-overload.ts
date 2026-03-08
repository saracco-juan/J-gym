/**
 * Use Case: evaluateOverload
 *
 * Función pura que recibe una estrategia de sobrecarga por inyección
 * y delega la evaluación del rendimiento del usuario.
 *
 * Esto permite desacoplar el algoritmo concreto del flujo de la app.
 */

import type {
    IOverloadStrategy,
    IPlannedExerciseData,
    IActualExerciseData,
    IOverloadSuggestion,
} from "../strategies/overload-strategy.interface";

export function evaluateOverload(
    strategy: IOverloadStrategy,
    planned: IPlannedExerciseData,
    actual: IActualExerciseData
): IOverloadSuggestion {
    return strategy.evaluate(planned, actual);
}
