/**
 * Default Routines Catalog — Plantillas semilla pre-cargadas.
 *
 * Los ejercicios tienen nombre definido pero series, reps y peso
 * quedan en 0 (semilla) para que el usuario ingrese sus marcas.
 *
 * Lógica de mapeo:
 * - 3 días → A, B, C
 * - 4 días → A, B, C, D (Brazos)
 * - 5 días → A, B, C, D, E (variantes sin repetir nombres)
 * - 6+ días → cicla A→B→C→D→E→A…
 */

import type { IRoutineExercise } from "@/core/domain/routine-template";

// ─── Tipos ─────────────────────────────────────────────────────────

interface SeedExercise {
    name: string;
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
    description: "Piernas/Hombros, Espalda/Bíceps, Pecho/Tríceps y más.",
    days: [
        {
            label: "Piernas / Hombros",
            exercises: [
                { name: "Sentadilla smith", sets: 0, reps: 0, weight: 0 },
                { name: "Cuádriceps", sets: 0, reps: 0, weight: 0 },
                { name: "Isquios", sets: 0, reps: 0, weight: 0 },
                { name: "Gemelos", sets: 0, reps: 0, weight: 0 },
                { name: "Prensa", sets: 0, reps: 0, weight: 0 },
                { name: "Press militar c/máquina", sets: 0, reps: 0, weight: 0 },
                { name: "Vuelo lateral", sets: 0, reps: 0, weight: 0 },
            ],
        },
        {
            label: "Espalda / Bíceps",
            exercises: [
                { name: "Dominadas", sets: 0, reps: 0, weight: 0 },
                { name: "Dorsalera", sets: 0, reps: 0, weight: 0 },
                { name: "Remo", sets: 0, reps: 0, weight: 0 },
                { name: "Pull c/mancuerna", sets: 0, reps: 0, weight: 0 },
                { name: "Martillo doble", sets: 0, reps: 0, weight: 0 },
                { name: "Scott", sets: 0, reps: 0, weight: 0 },
            ],
        },
        {
            label: "Pecho / Tríceps",
            exercises: [
                { name: "Press banca", sets: 0, reps: 0, weight: 0 },
                { name: "Press inclinado", sets: 0, reps: 0, weight: 0 },
                { name: "Aperturas", sets: 0, reps: 0, weight: 0 },
                { name: "Flexiones", sets: 0, reps: 0, weight: 0 },
                { name: "Canguro", sets: 0, reps: 0, weight: 0 },
                { name: "Polea tríceps", sets: 0, reps: 0, weight: 0 },
            ],
        },
        {
            label: "Brazos",
            exercises: [
                { name: "Curl barra", sets: 0, reps: 0, weight: 0 },
                { name: "Martillo alterno", sets: 0, reps: 0, weight: 0 },
                { name: "Predicador", sets: 0, reps: 0, weight: 0 },
                { name: "Fondos tríceps", sets: 0, reps: 0, weight: 0 },
                { name: "Press francés", sets: 0, reps: 0, weight: 0 },
                { name: "Extensión polea", sets: 0, reps: 0, weight: 0 },
            ],
        },
        {
            label: "Pecho / Espalda (Variante)",
            exercises: [
                { name: "Press pecho c/mancuerna", sets: 0, reps: 0, weight: 0 },
                { name: "Cruce de poleas", sets: 0, reps: 0, weight: 0 },
                { name: "Pullover", sets: 0, reps: 0, weight: 0 },
                { name: "Remo c/mancuerna", sets: 0, reps: 0, weight: 0 },
                { name: "Jalón agarre cerrado", sets: 0, reps: 0, weight: 0 },
                { name: "Face pull", sets: 0, reps: 0, weight: 0 },
            ],
        },
    ],
};

export const DEFAULT_ROUTINES: DefaultRoutine[] = [GYM_ROUTINE];

// ─── Mapeo a días de la semana ─────────────────────────────────────

function buildExercises(defs: SeedExercise[]): IRoutineExercise[] {
    return defs.map((def) => ({
        exercise: { id: crypto.randomUUID(), name: def.name },
        sets:
            def.sets > 0
                ? Array.from({ length: def.sets }, (_, i) => ({
                    setNumber: i + 1,
                    targetReps: def.reps,
                    targetWeight: def.weight,
                }))
                : [], // Semilla: el usuario debe llenar
    }));
}

/**
 * Mapea la rutina por defecto a los días seleccionados.
 *
 * - 3 días → Piernas/Hombros, Espalda/Bíceps, Pecho/Tríceps
 * - 4 días → +Brazos
 * - 5 días → +Variante Pecho/Espalda
 * - 6+ → cicla
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
