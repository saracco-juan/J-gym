/**
 * Default Routines Catalog — pre-loaded seed templates.
 *
 * Exercises, sets and reps are predefined; every weight stays at 0 because
 * each user enters their own. A target weight of 0 makes the workout open the
 * set editor for the first input.
 *
 * Mapping logic (see mapDefaultRoutineToDays): the routine days are assigned,
 * in order, to the weekdays the user selects. With more selected weekdays than
 * routine days, the routine cycles back to its first day.
 */

import type { IRoutineExercise } from "@/core/domain/routine-template";

// ─── Tipos ─────────────────────────────────────────────────────────

interface SeedExercise {
    name: string;
    /** Stable id of the matching entry in the exercise catalog. */
    catalogId: string;
    sets: number;
    reps: number;
    weight: number;
}

interface SeedDay {
    label: string;
    exercises: SeedExercise[];
}

export interface DefaultRoutine {
    id: string;
    name: string;
    description: string;
    days: SeedDay[];
}

// ─── Plantilla de Gimnasio ─────────────────────────────────────────

const GYM_ROUTINE: DefaultRoutine = {
    id: "gym",
    name: "Rutina de Gimnasio",
    description: "Cardio, Piernas, Pecho / Hombros y Espalda / Hombros.",
    days: [
        {
            label: "Cardio",
            exercises: [
                { name: "Cardio", catalogId: "cardio", sets: 1, reps: 1, weight: 0 },
            ],
        },
        {
            label: "Piernas",
            exercises: [
                { name: "Sentadilla", catalogId: "back-squat", sets: 3, reps: 8, weight: 0 },
                { name: "Cuádriceps", catalogId: "leg-extension", sets: 3, reps: 10, weight: 0 },
                { name: "Isquios", catalogId: "leg-curl", sets: 3, reps: 10, weight: 0 },
                { name: "Gemelos", catalogId: "calf-raise", sets: 3, reps: 15, weight: 0 },
                { name: "Prensa", catalogId: "leg-press", sets: 3, reps: 8, weight: 0 },
            ],
        },
        {
            label: "Pecho / Hombros",
            exercises: [
                { name: "Press banca", catalogId: "bench-press", sets: 4, reps: 10, weight: 0 },
                { name: "Press inclinado en smith", catalogId: "incline-bench-press", sets: 4, reps: 10, weight: 0 },
                { name: "Aperturas", catalogId: "dumbbell-fly", sets: 4, reps: 10, weight: 0 },
                { name: "Press militar con máquina", catalogId: "machine-shoulder-press", sets: 4, reps: 10, weight: 0 },
                { name: "Vuelo lateral con polea", catalogId: "cable-lateral-raise", sets: 4, reps: 10, weight: 0 },
            ],
        },
        {
            label: "Espalda / Hombros",
            exercises: [
                { name: "Dorsalera", catalogId: "lat-pulldown", sets: 4, reps: 8, weight: 0 },
                { name: "Remo", catalogId: "seated-cable-row", sets: 4, reps: 8, weight: 0 },
                { name: "Rear delt", catalogId: "rear-delt-fly", sets: 4, reps: 8, weight: 0 },
                { name: "Press militar con mancuerna", catalogId: "dumbbell-shoulder-press", sets: 4, reps: 8, weight: 0 },
                { name: "Vuelos laterales con mancuerna", catalogId: "lateral-raise", sets: 4, reps: 8, weight: 0 },
            ],
        },
    ],
};

export const DEFAULT_ROUTINES: DefaultRoutine[] = [GYM_ROUTINE];

// ─── Mapeo a días de la semana ─────────────────────────────────────

function buildExercises(defs: SeedExercise[]): IRoutineExercise[] {
    return defs.map((def) => ({
        exercise: { id: crypto.randomUUID(), name: def.name },
        ref: { source: "catalog", id: def.catalogId },
        sets:
            def.sets > 0
                ? Array.from({ length: def.sets }, (_, i) => ({
                    setNumber: i + 1,
                    targetReps: def.reps,
                    targetWeight: def.weight,
                }))
                : [], // Seed without sets: the user fills them in
    }));
}

/**
 * Maps the default routine onto the selected weekdays.
 *
 * Routine days are assigned in order: Cardio, Piernas, Pecho / Hombros,
 * Espalda / Hombros. Selecting more weekdays than the routine has days
 * cycles back to the first one.
 */
export function mapDefaultRoutineToDays(
    selectedDays: string[],
    routine: DefaultRoutine = GYM_ROUTINE
): { dayName: string; dayLabel: string; exercises: IRoutineExercise[] }[] {
    return selectedDays.map((dayName, i) => {
        const templateDay = routine.days[i % routine.days.length];
        return {
            dayName,
            dayLabel: templateDay.label,
            exercises: buildExercises(templateDay.exercises),
        };
    });
}
