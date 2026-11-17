/**
 * Routine editor. Pure: no framework or storage imports.
 *
 * The editor works on a draft of the weekly routine: one day per weekday, each
 * with exercises whose sets, reps and weight are kept as the text the user
 * typed (so an empty or half typed field can be reported precisely). Every
 * operation returns a new draft. `planRoutineSave` turns the edited draft into
 * the writes to make, touching only what changed.
 *
 * A routine day is identified by its weekday (`routine_templates` is unique per
 * user and weekday), so the weekday is chosen when a day is added and does not
 * change afterwards. The data model has no free text day label.
 */

import { getCatalogExercise, resolveLegacyExerciseName } from "../catalog";
import type { ExerciseRef } from "../catalog/types";
import type { IRoutineExercise, IRoutineTemplate } from "../domain/routine-template";
import { formatWeight } from "../session/display";
import type { ExerciseDescriptor } from "../session/types";

/** Weekday names as stored in `routine_templates.day_name`, Monday first. */
export const WEEKDAYS: readonly string[] = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
];

export const MIN_SETS = 1;
export const MAX_SETS = 10;
export const MIN_REPS = 1;
export const MAX_REPS = 100;
export const MAX_WEIGHT = 1000;

const DEFAULT_SETS = "3";
const DEFAULT_REPS = "10";

export interface DraftExercise {
    /** Routine exercise id: stable for stored exercises, a fresh UUID for new ones. */
    id: string;
    name: string;
    /** Catalog or custom reference. Absent only for free text legacy exercises. */
    ref?: ExerciseRef;
    isBodyweight: boolean;
    /** Typed text of the sets count, the target reps and the target weight (kg). */
    sets: string;
    reps: string;
    weight: string;
}

export interface DraftDay {
    /** The stored routine id, or a fresh UUID for a day added in the editor. */
    id: string;
    dayName: string;
    exercises: DraftExercise[];
}

export type DraftIssueField = "days" | "exercises" | "sets" | "reps" | "weight";

export interface DraftIssue {
    /** Empty for the issue about the routine as a whole. */
    dayId: string;
    exerciseId: string | null;
    field: DraftIssueField;
    /** Spanish, specific, ready to show inline. */
    message: string;
}

export interface RoutineSavePlan {
    /** Routines to create or update. */
    upserts: IRoutineTemplate[];
    /** Ids of the routines to delete. */
    deletes: string[];
}

export function weekdayLabel(dayName: string): string {
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
}

// ─── Draft from stored routines ────────────────────────────────────

function weekdayRank(dayName: string): number {
    const rank = WEEKDAYS.indexOf(dayName);
    return rank === -1 ? WEEKDAYS.length : rank;
}

function sortDays(days: DraftDay[]): DraftDay[] {
    return [...days].sort((a, b) => weekdayRank(a.dayName) - weekdayRank(b.dayName));
}

function resolveRef(item: IRoutineExercise): ExerciseRef | undefined {
    if (item.ref) return item.ref;
    const catalogId = resolveLegacyExerciseName(item.exercise.name);
    return catalogId ? { source: "catalog", id: catalogId } : undefined;
}

function isBodyweightRef(ref: ExerciseRef | undefined): boolean {
    return ref?.source === "catalog" ? (getCatalogExercise(ref.id)?.isBodyweight ?? false) : false;
}

function draftExercise(item: IRoutineExercise): DraftExercise {
    const ref = resolveRef(item);
    const first = item.sets[0];
    return {
        id: item.exercise.id,
        name: item.exercise.name,
        ...(ref ? { ref } : {}),
        isBodyweight: isBodyweightRef(ref),
        sets: String(item.sets.length),
        reps: String(first?.targetReps ?? 0),
        weight: first && first.targetWeight > 0 ? formatWeight(first.targetWeight) : "",
    };
}

/** One draft day per stored routine, in week order. */
export function draftFromTemplates(templates: readonly IRoutineTemplate[]): DraftDay[] {
    return sortDays(
        templates.map((t) => ({
            id: t.id,
            dayName: t.dayName,
            exercises: t.exercises.map(draftExercise),
        }))
    );
}

// ─── Operations ────────────────────────────────────────────────────

/** Weekdays that have no day in the draft yet, in week order. */
export function availableWeekdays(days: readonly DraftDay[]): string[] {
    const used = new Set(days.map((d) => d.dayName));
    return WEEKDAYS.filter((w) => !used.has(w));
}

/** Adds an empty day. Returns the same draft for a used or unknown weekday. */
export function addDay(days: DraftDay[], dayName: string, id: string): DraftDay[] {
    if (!availableWeekdays(days).includes(dayName)) return days;
    return sortDays([...days, { id, dayName, exercises: [] }]);
}

export function removeDay(days: DraftDay[], dayId: string): DraftDay[] {
    return days.filter((d) => d.id !== dayId);
}

function mapDay(
    days: DraftDay[],
    dayId: string,
    change: (exercises: DraftExercise[]) => DraftExercise[]
): DraftDay[] {
    return days.map((d) => (d.id === dayId ? { ...d, exercises: change(d.exercises) } : d));
}

/** Appends an exercise with default targets (3 sets of 10, no weight). */
export function addExercise(
    days: DraftDay[],
    dayId: string,
    exercise: ExerciseDescriptor,
    id: string
): DraftDay[] {
    return mapDay(days, dayId, (list) => [
        ...list,
        {
            id,
            name: exercise.name,
            ref: exercise.ref,
            isBodyweight: exercise.isBodyweight,
            sets: DEFAULT_SETS,
            reps: DEFAULT_REPS,
            weight: "",
        },
    ]);
}

export function removeExercise(days: DraftDay[], dayId: string, exerciseId: string): DraftDay[] {
    return mapDay(days, dayId, (list) => list.filter((e) => e.id !== exerciseId));
}

/** Moves an exercise one position. A move past either end changes nothing. */
export function moveExercise(
    days: DraftDay[],
    dayId: string,
    exerciseId: string,
    direction: "up" | "down"
): DraftDay[] {
    return mapDay(days, dayId, (list) => {
        const from = list.findIndex((e) => e.id === exerciseId);
        const to = direction === "up" ? from - 1 : from + 1;
        if (from === -1 || to < 0 || to >= list.length) return list;
        const next = [...list];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
    });
}

export function updateExercise(
    days: DraftDay[],
    dayId: string,
    exerciseId: string,
    patch: Partial<Pick<DraftExercise, "sets" | "reps" | "weight">>
): DraftDay[] {
    return mapDay(days, dayId, (list) =>
        list.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e))
    );
}

// ─── Validation ────────────────────────────────────────────────────

/** A whole number within [min, max], or null. */
function parseCount(text: string, min: number, max: number): number | null {
    const raw = text.trim();
    if (!/^\d+$/.test(raw)) return null;
    const value = Number(raw);
    return value >= min && value <= max ? value : null;
}

/** A weight in kg: empty means none (0); dot or comma decimals; 0 to MAX_WEIGHT. Null when invalid. */
function parseWeight(text: string): number | null {
    const raw = text.trim().replace(",", ".");
    if (raw === "") return 0;
    if (!/^\d+(\.\d+)?$/.test(raw)) return null;
    const value = Number(raw);
    return value <= MAX_WEIGHT ? value : null;
}

const SETS_MESSAGE = `Series: ingresa un número entero entre ${MIN_SETS} y ${MAX_SETS}.`;
const REPS_MESSAGE = `Repeticiones: ingresa un número entero entre ${MIN_REPS} y ${MAX_REPS}.`;
const WEIGHT_MESSAGE = `Peso: ingresa un número entre 0 y ${MAX_WEIGHT}, por ejemplo 62,5.`;

/** Every problem that blocks saving, in reading order. Empty when the draft is valid. */
export function validateDraft(days: readonly DraftDay[]): DraftIssue[] {
    if (days.length === 0) {
        return [
            {
                dayId: "",
                exerciseId: null,
                field: "days",
                message: "La rutina necesita al menos un día de entrenamiento.",
            },
        ];
    }

    const issues: DraftIssue[] = [];
    for (const day of days) {
        if (day.exercises.length === 0) {
            issues.push({
                dayId: day.id,
                exerciseId: null,
                field: "exercises",
                message: `${weekdayLabel(day.dayName)} no tiene ejercicios. Agrega al menos uno o elimina el día.`,
            });
        }
        for (const ex of day.exercises) {
            const check = (field: "sets" | "reps" | "weight", ok: boolean, message: string) => {
                if (!ok) issues.push({ dayId: day.id, exerciseId: ex.id, field, message });
            };
            check("sets", parseCount(ex.sets, MIN_SETS, MAX_SETS) !== null, SETS_MESSAGE);
            check("reps", parseCount(ex.reps, MIN_REPS, MAX_REPS) !== null, REPS_MESSAGE);
            check("weight", parseWeight(ex.weight) !== null, WEIGHT_MESSAGE);
        }
    }
    return issues;
}

// ─── Save plan ─────────────────────────────────────────────────────

/** Exercise of a validated draft as it is stored. Untouched targets keep their stored per set values. */
function toRoutineExercise(draft: DraftExercise, stored: IRoutineExercise | undefined): IRoutineExercise {
    const count = parseCount(draft.sets, MIN_SETS, MAX_SETS) ?? 0;
    const reps = parseCount(draft.reps, MIN_REPS, MAX_REPS) ?? 0;
    const weight = parseWeight(draft.weight) ?? 0;
    const ref = draft.ref ? { ref: draft.ref } : {};

    const unchanged =
        stored !== undefined &&
        stored.sets.length === count &&
        stored.sets[0]?.targetReps === reps &&
        stored.sets[0]?.targetWeight === weight;
    if (stored && unchanged) return { ...stored, ...ref };

    return {
        exercise: { id: draft.id, name: draft.name },
        ...ref,
        sets: Array.from({ length: count }, (_, i) => ({
            setNumber: i + 1,
            targetReps: reps,
            targetWeight: weight,
        })),
    };
}

/**
 * The writes that turn `original` into the edited `draft` (which must be
 * valid): upserts for new or changed days, deletes for removed ones. Days left
 * as they were are skipped. A removed weekday that was added back reuses the
 * stored routine id, so it becomes one update instead of a delete and a create.
 */
export function planRoutineSave(input: {
    userId: string;
    original: readonly IRoutineTemplate[];
    draft: readonly DraftDay[];
}): RoutineSavePlan {
    const { userId, original, draft } = input;
    const storedById = new Map(original.map((t) => [t.id, t]));
    const storedByDay = new Map(original.map((t) => [t.dayName, t]));
    const initialById = new Map(draftFromTemplates(original).map((d) => [d.id, d]));

    const kept = new Set<string>();
    const upserts: IRoutineTemplate[] = [];

    for (const day of draft) {
        const stored = storedById.get(day.id) ?? storedByDay.get(day.dayName);
        const id = stored?.id ?? day.id;
        kept.add(id);

        const initial = initialById.get(id);
        if (initial && JSON.stringify(initial.exercises) === JSON.stringify(day.exercises)) continue;

        upserts.push({
            id,
            userId,
            dayName: day.dayName,
            exercises: day.exercises.map((ex) =>
                toRoutineExercise(ex, stored?.exercises.find((s) => s.exercise.id === ex.id))
            ),
        });
    }

    return { upserts, deletes: original.filter((t) => !kept.has(t.id)).map((t) => t.id) };
}
