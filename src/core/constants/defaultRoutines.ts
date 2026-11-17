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
    description: "Piernas/Hombros, Espalda/Bíceps, Pecho/Tríceps y más.",
    days: [
        {
            label: "Piernas / Hombros",
            exercises: [
                { name: "Sentadilla smith", catalogId: "smith-squat", sets: 0, reps: 0, weight: 0 },
                { name: "Cuádriceps", catalogId: "leg-extension", sets: 0, reps: 0, weight: 0 },
                { name: "Isquios", catalogId: "leg-curl", sets: 0, reps: 0, weight: 0 },
                { name: "Gemelos", catalogId: "calf-raise", sets: 0, reps: 0, weight: 0 },
                { name: "Prensa", catalogId: "leg-press", sets: 0, reps: 0, weight: 0 },
                { name: "Press militar c/máquina", catalogId: "machine-shoulder-press", sets: 0, reps: 0, weight: 0 },
                { name: "Vuelo lateral", catalogId: "lateral-raise", sets: 0, reps: 0, weight: 0 },
            ],
        },
        {
            label: "Espalda / Bíceps",
            exercises: [
                { name: "Dominadas", catalogId: "pull-up", sets: 0, reps: 0, weight: 0 },
                { name: "Dorsalera", catalogId: "lat-pulldown", sets: 0, reps: 0, weight: 0 },
                { name: "Remo", catalogId: "seated-cable-row", sets: 0, reps: 0, weight: 0 },
                { name: "Pull c/mancuerna", catalogId: "dumbbell-row", sets: 0, reps: 0, weight: 0 },
                { name: "Martillo doble", catalogId: "hammer-curl", sets: 0, reps: 0, weight: 0 },
                { name: "Scott", catalogId: "preacher-curl", sets: 0, reps: 0, weight: 0 },
            ],
        },
        {
            label: "Pecho / Tríceps",
            exercises: [
                { name: "Press banca", catalogId: "bench-press", sets: 0, reps: 0, weight: 0 },
                { name: "Press inclinado", catalogId: "incline-bench-press", sets: 0, reps: 0, weight: 0 },
                { name: "Aperturas", catalogId: "dumbbell-fly", sets: 0, reps: 0, weight: 0 },
                { name: "Flexiones", catalogId: "push-up", sets: 0, reps: 0, weight: 0 },
                { name: "Canguro", catalogId: "triceps-kickback", sets: 0, reps: 0, weight: 0 },
                { name: "Polea tríceps", catalogId: "triceps-pushdown", sets: 0, reps: 0, weight: 0 },
            ],
        },
        {
            label: "Brazos",
            exercises: [
                { name: "Curl barra", catalogId: "barbell-curl", sets: 0, reps: 0, weight: 0 },
                { name: "Martillo alterno", catalogId: "alternating-hammer-curl", sets: 0, reps: 0, weight: 0 },
                { name: "Predicador", catalogId: "preacher-curl", sets: 0, reps: 0, weight: 0 },
                { name: "Fondos tríceps", catalogId: "dips", sets: 0, reps: 0, weight: 0 },
                { name: "Press francés", catalogId: "skull-crusher", sets: 0, reps: 0, weight: 0 },
                { name: "Extensión polea", catalogId: "triceps-pushdown", sets: 0, reps: 0, weight: 0 },
            ],
        },
        {
            label: "Pecho / Espalda (Variante)",
            exercises: [
                { name: "Press pecho c/mancuerna", catalogId: "dumbbell-bench-press", sets: 0, reps: 0, weight: 0 },
                { name: "Cruce de poleas", catalogId: "cable-crossover", sets: 0, reps: 0, weight: 0 },
                { name: "Pullover", catalogId: "dumbbell-pullover", sets: 0, reps: 0, weight: 0 },
                { name: "Remo c/mancuerna", catalogId: "dumbbell-row", sets: 0, reps: 0, weight: 0 },
                { name: "Jalón agarre cerrado", catalogId: "close-grip-pulldown", sets: 0, reps: 0, weight: 0 },
                { name: "Face pull", catalogId: "face-pull", sets: 0, reps: 0, weight: 0 },
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
