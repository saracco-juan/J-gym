"use client";

/**
 * Active Workout Store (Zustand)
 *
 * Estado en memoria de una sesión de entrenamiento activa.
 * Puente entre la UI de React y la lógica pura de src/core/.
 *
 * REGLA DE NEGOCIO: El peso (kg/lb) NUNCA se calcula automáticamente.
 * Si la evaluación indica "increase_weight", el store espera confirmación
 * manual del usuario vía confirmNewWeight().
 */

import { create } from "zustand";

import type { IRoutineTemplate } from "@/core/domain/routine-template";
import type { ISetResult } from "@/core/domain/exercises";
import { evaluateOverload } from "@/core/use-cases/evaluate-overload";
import { StandardHypertrophyStrategy } from "@/core/strategies/standard-hypertrophy.strategy";
import type { IOverloadSuggestion } from "@/core/strategies/overload-strategy.interface";

// ─── Tipos internos del store ──────────────────────────────────────

/** Registro temporal de un ejercicio durante la sesión activa. */
interface ExerciseLog {
    exerciseId: string;
    sets: ISetResult[];
}

/** Resultado de la evaluación de sobrecarga por ejercicio. */
interface OverloadEvaluation {
    exerciseId: string;
    suggestion: IOverloadSuggestion;
}

// ─── State & Actions ───────────────────────────────────────────────

interface WorkoutState {
    activeTemplate: IRoutineTemplate | null;
    currentLogs: ExerciseLog[];
    pendingWeightUpdates: string[];
    isWeightModalOpen: boolean;
    /** Resultados de evaluación por ejercicio, disponibles tras finishWorkout. */
    evaluations: OverloadEvaluation[];
}

interface WorkoutActions {
    startWorkout: (template: IRoutineTemplate) => void;
    logSet: (
        exerciseId: string,
        setIndex: number,
        reps: number,
        weight: number
    ) => void;
    finishWorkout: () => void;
    confirmNewWeight: (exerciseId: string, manualWeight: number) => void;
    resetStore: () => void;
}

// ─── Estrategia por defecto ────────────────────────────────────────

const hypertrophyStrategy = new StandardHypertrophyStrategy();

// ─── Store ─────────────────────────────────────────────────────────

export const useWorkoutStore = create<WorkoutState & WorkoutActions>()(
    (set, get) => ({
        // --- Estado inicial ---
        activeTemplate: null,
        currentLogs: [],
        pendingWeightUpdates: [],
        isWeightModalOpen: false,
        evaluations: [],

        // --- Actions ---

        startWorkout: (template) => {
            set({
                activeTemplate: structuredClone(template),
                currentLogs: [],
                pendingWeightUpdates: [],
                isWeightModalOpen: false,
                evaluations: [],
            });
        },

        logSet: (exerciseId, setIndex, reps, weight) => {
            const { activeTemplate, currentLogs } = get();

            // Edge case: no hay sesión activa → ignorar
            if (!activeTemplate) {
                console.warn(
                    "[useWorkoutStore] logSet ignorado: no hay sesión activa."
                );
                return;
            }

            // Verificar que el ejercicio pertenece al template activo
            const exerciseExists = activeTemplate.exercises.some(
                (e) => e.exercise.id === exerciseId
            );
            if (!exerciseExists) {
                console.warn(
                    `[useWorkoutStore] logSet ignorado: ejercicio "${exerciseId}" no existe en el template activo.`
                );
                return;
            }

            const newResult: ISetResult = {
                setNumber: setIndex + 1,
                actualReps: reps,
                actualWeight: weight,
            };

            // Clonar logs e insertar/actualizar la serie
            const updatedLogs = [...currentLogs];
            const existingLogIndex = updatedLogs.findIndex(
                (log) => log.exerciseId === exerciseId
            );

            if (existingLogIndex === -1) {
                // Primer set de este ejercicio
                updatedLogs.push({
                    exerciseId,
                    sets: [newResult],
                });
            } else {
                // Actualizar o agregar set dentro del ejercicio existente
                const exerciseLog = { ...updatedLogs[existingLogIndex] };
                const updatedSets = [...exerciseLog.sets];
                const existingSetIndex = updatedSets.findIndex(
                    (s) => s.setNumber === newResult.setNumber
                );

                if (existingSetIndex === -1) {
                    updatedSets.push(newResult);
                } else {
                    updatedSets[existingSetIndex] = newResult;
                }

                exerciseLog.sets = updatedSets;
                updatedLogs[existingLogIndex] = exerciseLog;
            }

            set({ currentLogs: updatedLogs });
        },

        finishWorkout: () => {
            const { activeTemplate, currentLogs } = get();

            if (!activeTemplate) {
                console.warn(
                    "[useWorkoutStore] finishWorkout ignorado: no hay sesión activa."
                );
                return;
            }

            const evaluations: OverloadEvaluation[] = [];
            const pendingIds: string[] = [];

            // Clonar template para mutar solo los próximos sets (no peso)
            const updatedTemplate = structuredClone(activeTemplate);

            for (const log of currentLogs) {
                // Buscar el ejercicio planeado correspondiente
                const plannedExercise = updatedTemplate.exercises.find(
                    (e) => e.exercise.id === log.exerciseId
                );

                if (!plannedExercise) continue;

                const suggestion = evaluateOverload(
                    hypertrophyStrategy,
                    { sets: plannedExercise.sets },
                    { sets: log.sets }
                );

                evaluations.push({
                    exerciseId: log.exerciseId,
                    suggestion,
                });

                if (suggestion.type === "increase_weight") {
                    // REGLA ESTRICTA: NO modificar peso → esperar input manual
                    pendingIds.push(log.exerciseId);
                } else {
                    // "progress" o "maintain": actualizar sets en el template
                    plannedExercise.sets = suggestion.nextSets;
                }
            }

            set({
                activeTemplate: updatedTemplate,
                evaluations,
                pendingWeightUpdates: pendingIds,
                isWeightModalOpen: pendingIds.length > 0,
            });
        },

        confirmNewWeight: (exerciseId, manualWeight) => {
            const { activeTemplate, pendingWeightUpdates, evaluations } = get();

            if (!activeTemplate) return;

            const updatedTemplate = structuredClone(activeTemplate);
            const exerciseInTemplate = updatedTemplate.exercises.find(
                (e) => e.exercise.id === exerciseId
            );

            if (!exerciseInTemplate) return;

            // Buscar la sugerencia de evaluación para obtener los nextSets correctos
            const evaluation = evaluations.find(
                (ev) => ev.exerciseId === exerciseId
            );

            if (evaluation) {
                // Aplicar la estructura de sets sugerida con el peso manual
                exerciseInTemplate.sets = evaluation.suggestion.nextSets.map((s) => ({
                    ...s,
                    targetWeight: manualWeight,
                }));
            } else {
                // Fallback: solo actualizar el peso en los sets existentes
                exerciseInTemplate.sets = exerciseInTemplate.sets.map((s) => ({
                    ...s,
                    targetWeight: manualWeight,
                }));
            }

            const updatedPending = pendingWeightUpdates.filter(
                (id) => id !== exerciseId
            );

            set({
                activeTemplate: updatedTemplate,
                pendingWeightUpdates: updatedPending,
                isWeightModalOpen: updatedPending.length > 0,
            });
        },

        resetStore: () => {
            set({
                activeTemplate: null,
                currentLogs: [],
                pendingWeightUpdates: [],
                isWeightModalOpen: false,
                evaluations: [],
            });
        },
    })
);
