/**
 * StandardHypertrophyStrategy
 *
 * Implementación concreta de la regla de sobrecarga 3x12 → 4x8
 * definida en docs/specs/overload-rules.md.
 *
 * Escenarios:
 * 1. Éxito:    Cumple reps objetivo → sube sets (3→4), baja reps (12→8), mismo peso.
 * 2. Evolución: Ya en 4 sets y cumple 4x12 → sugiere subir peso, reduce a 3x8.
 * 3. Fallo:    No alcanza reps mínimas → mantiene esquema actual.
 */

import type { ISetPlan } from "../domain/exercises";
import type {
    IOverloadStrategy,
    IPlannedExerciseData,
    IActualExerciseData,
    IOverloadSuggestion,
} from "./overload-strategy.interface";

/** Umbrales configurables para la estrategia de hipertrofia estándar. */
interface HypertrophyConfig {
    /** Sets iniciales (por defecto 3). */
    initialSets: number;
    /** Sets máximos antes de subir peso (por defecto 4). */
    maxSets: number;
    /** Reps objetivo en fase inicial (por defecto 12). */
    targetRepsHigh: number;
    /** Reps reducidas al subir sets o peso (por defecto 8). */
    targetRepsLow: number;
}

const DEFAULT_CONFIG: HypertrophyConfig = {
    initialSets: 3,
    maxSets: 4,
    targetRepsHigh: 12,
    targetRepsLow: 8,
};

export class StandardHypertrophyStrategy implements IOverloadStrategy {
    private config: HypertrophyConfig;

    constructor(config: Partial<HypertrophyConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    evaluate(
        planned: IPlannedExerciseData,
        actual: IActualExerciseData
    ): IOverloadSuggestion {
        const { initialSets, maxSets, targetRepsHigh, targetRepsLow } = this.config;

        const plannedSetsCount = planned.sets.length;
        const targetReps = planned.sets[0]?.targetReps ?? targetRepsHigh;
        const currentWeight = planned.sets[0]?.targetWeight ?? 0;

        // Verificar si el usuario alcanzó las reps objetivo en TODAS las series
        const allSetsCompleted = actual.sets.length >= plannedSetsCount
            && actual.sets
                .slice(0, plannedSetsCount)
                .every((set) => set.actualReps >= targetReps);

        // --- Escenario de FALLO ---
        if (!allSetsCompleted) {
            return {
                type: "maintain",
                nextSets: planned.sets.map((s) => ({ ...s })),
                message: `No se alcanzaron las repeticiones objetivo. Mantener ${plannedSetsCount}x${targetReps} con ${currentWeight}kg.`,
            };
        }

        // --- Escenario de EVOLUCIÓN ---
        // Ya está en sets máximos Y alcanzó las reps altas → subir peso
        if (plannedSetsCount >= maxSets && targetReps >= targetRepsHigh) {
            const nextSets: ISetPlan[] = Array.from(
                { length: initialSets },
                (_, i) => ({
                    setNumber: i + 1,
                    targetReps: targetRepsLow,
                    targetWeight: currentWeight, // El peso se confirma externamente
                })
            );

            return {
                type: "increase_weight",
                nextSets,
                message: `¡Excelente! Completaste ${plannedSetsCount}x${targetReps} con ${currentWeight}kg. Subí el peso y arrancá con ${initialSets}x${targetRepsLow}.`,
            };
        }

        // --- Escenario de ÉXITO ---
        // Cumplió el objetivo → agregar una serie, bajar reps
        const nextSetCount = Math.min(plannedSetsCount + 1, maxSets);
        const nextSets: ISetPlan[] = Array.from(
            { length: nextSetCount },
            (_, i) => ({
                setNumber: i + 1,
                targetReps: targetRepsLow,
                targetWeight: currentWeight,
            })
        );

        return {
            type: "progress",
            nextSets,
            message: `¡Bien! Completaste ${plannedSetsCount}x${targetReps}. Progresá a ${nextSetCount}x${targetRepsLow} con ${currentWeight}kg.`,
        };
    }
}
