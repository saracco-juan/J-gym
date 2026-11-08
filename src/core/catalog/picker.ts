/**
 * Exercise picker logic: merge the static catalog with the user's custom
 * exercises, filter them and validate new custom names. Pure.
 */

import { EXERCISE_CATALOG, normalizeExerciseName, resolveLegacyExerciseName } from "./index";
import type { CustomExercise, ExerciseRef, MuscleGroup } from "./types";

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
    "chest",
    "back",
    "legs",
    "glutes",
    "shoulders",
    "arms",
    "core",
];

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
    chest: "Pecho",
    back: "Espalda",
    legs: "Piernas",
    glutes: "Glúteos",
    shoulders: "Hombros",
    arms: "Brazos",
    core: "Core",
};

export function muscleGroupLabel(group: MuscleGroup): string {
    return MUSCLE_GROUP_LABELS[group];
}

export interface PickerOption {
    ref: ExerciseRef;
    name: string;
    muscleGroup: MuscleGroup;
    isBodyweight: boolean;
}

export interface PickerQuery {
    query: string;
    muscleGroup: MuscleGroup | null;
    custom: readonly CustomExercise[];
    /** Exercises to hide, e.g. the one being replaced. */
    exclude?: readonly ExerciseRef[];
}

/** Catalog matches first (catalog order), then custom ones by name. */
export function buildPickerOptions({
    query,
    muscleGroup,
    custom,
    exclude = [],
}: PickerQuery): PickerOption[] {
    const needle = normalizeExerciseName(query);
    const excluded = new Set(exclude.map((r) => `${r.source}:${r.id}`));

    const catalog: PickerOption[] = EXERCISE_CATALOG.filter((e) => {
        if (muscleGroup && e.muscleGroup !== muscleGroup) return false;
        if (needle === "") return true;
        return [e.nameEs, ...(e.aliases ?? [])].some((label) =>
            normalizeExerciseName(label).includes(needle)
        );
    }).map((e) => ({
        ref: { source: "catalog" as const, id: e.id },
        name: e.nameEs,
        muscleGroup: e.muscleGroup,
        isBodyweight: e.isBodyweight,
    }));

    const own: PickerOption[] = custom
        .filter((e) => {
            if (muscleGroup && e.muscleGroup !== muscleGroup) return false;
            return needle === "" || normalizeExerciseName(e.name).includes(needle);
        })
        .map((e) => ({
            ref: { source: "custom" as const, id: e.id },
            name: e.name,
            muscleGroup: e.muscleGroup,
            isBodyweight: e.isBodyweight,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"));

    return [...catalog, ...own].filter((o) => !excluded.has(`${o.ref.source}:${o.ref.id}`));
}

export const CUSTOM_NAME_MAX_LENGTH = 60;

export type CustomNameValidation =
    | { ok: true; name: string }
    | { ok: false; reason: "empty" | "too-long" | "duplicate" };

export function validateCustomExerciseName(
    raw: string,
    existing: readonly CustomExercise[]
): CustomNameValidation {
    const name = raw.trim().replace(/\s+/g, " ");
    if (name === "") return { ok: false, reason: "empty" };
    if (name.length > CUSTOM_NAME_MAX_LENGTH) return { ok: false, reason: "too-long" };
    const normalized = normalizeExerciseName(name);
    const duplicate =
        resolveLegacyExerciseName(name) !== null ||
        existing.some((e) => normalizeExerciseName(e.name) === normalized);
    if (duplicate) return { ok: false, reason: "duplicate" };
    return { ok: true, name };
}
