import { EXERCISE_CATALOG } from "./exercises";
import type { CatalogExercise } from "./types";

export type {
    CatalogExercise,
    CustomExercise,
    ExerciseRef,
    ExerciseType,
    MuscleGroup,
} from "./types";
export { EXERCISE_CATALOG } from "./exercises";

/** Lowercase, strip accents and collapse whitespace. */
export function normalizeExerciseName(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

const BY_ID = new Map<string, CatalogExercise>(
    EXERCISE_CATALOG.map((e) => [e.id, e])
);

const BY_NAME = new Map<string, string>();
for (const entry of EXERCISE_CATALOG) {
    for (const label of [entry.nameEs, ...(entry.aliases ?? [])]) {
        BY_NAME.set(normalizeExerciseName(label), entry.id);
    }
}

export function getCatalogExercise(id: string): CatalogExercise | undefined {
    return BY_ID.get(id);
}

/** Accent- and case-insensitive search over Spanish names and aliases. */
export function searchCatalog(query: string): CatalogExercise[] {
    const needle = normalizeExerciseName(query);
    if (needle === "") return [...EXERCISE_CATALOG];
    return EXERCISE_CATALOG.filter((e) =>
        [e.nameEs, ...(e.aliases ?? [])].some((label) =>
            normalizeExerciseName(label).includes(needle)
        )
    );
}

/**
 * Maps a legacy free-text exercise name to a catalog id, or null when it
 * does not match any catalog name or alias.
 */
export function resolveLegacyExerciseName(name: string): string | null {
    return BY_NAME.get(normalizeExerciseName(name)) ?? null;
}
