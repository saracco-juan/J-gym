/**
 * Utilities de mapeo para el wizard de onboarding.
 *
 * Convierte entre el formato del catálogo (IRoutineExercise[])
 * y el formato del wizard (WizardExercise[]).
 */

import type { IRoutineExercise } from "@/core/domain/routine-template";
import type { DayExercises, WizardExercise } from "./ExerciseSetup";
import { mapDefaultRoutineToDays } from "@/core/constants/defaultRoutines";
import type { DefaultRoutine } from "@/core/constants/defaultRoutines";

/**
 * Convierte WizardExercise[] a IRoutineExercise[] para la Server Action.
 */
export function wizardToRoutineExercises(exercises: WizardExercise[]): IRoutineExercise[] {
    return exercises.map((ex) => ({
        exercise: { id: ex.id, name: ex.name.trim() },
        sets: Array.from({ length: ex.targetSets }, (_, i) => ({
            setNumber: i + 1,
            targetReps: ex.targetReps,
            targetWeight: ex.initialWeight,
        })),
    }));
}

/**
 * Genera DayExercises (formato wizard) desde la rutina por defecto.
 * Ejercicios pre-llenados con nombre, pero series/reps/peso = 0 (semilla).
 */
export function generateDefaultRoutine(
    dayNames: string[],
    routine?: DefaultRoutine
): DayExercises[] {
    const mapped = mapDefaultRoutineToDays(dayNames, routine);

    return mapped.map((tmpl) => ({
        dayName: tmpl.dayName,
        dayLabel: tmpl.dayLabel,
        exercises: tmpl.exercises.map((re) => ({
            id: re.exercise.id,
            name: re.exercise.name,
            targetSets: re.sets.length || 0,
            targetReps: re.sets[0]?.targetReps ?? 0,
            initialWeight: re.sets[0]?.targetWeight ?? 0,
        })),
    }));
}
