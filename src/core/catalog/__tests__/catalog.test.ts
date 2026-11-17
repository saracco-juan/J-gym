import {
    EXERCISE_CATALOG,
    getCatalogExercise,
    normalizeExerciseName,
    resolveLegacyExerciseName,
    searchCatalog,
} from "../index";
import { DEFAULT_ROUTINES } from "../../constants/defaultRoutines";

const MUSCLE_GROUPS = ["chest", "back", "legs", "glutes", "shoulders", "arms", "core"];

describe("catalog integrity", () => {
    it("ships about 40 exercises", () => {
        expect(EXERCISE_CATALOG.length).toBeGreaterThanOrEqual(40);
    });

    it("has unique kebab-case ids", () => {
        const ids = EXERCISE_CATALOG.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach((id) => expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
    });

    it("has unique normalized names and aliases across entries", () => {
        const seen = new Map<string, string>();
        for (const e of EXERCISE_CATALOG) {
            for (const label of [e.nameEs, ...(e.aliases ?? [])]) {
                const key = normalizeExerciseName(label);
                expect(seen.get(key) ?? e.id).toBe(e.id);
                seen.set(key, e.id);
            }
        }
    });

    it("gives every entry a name, valid group/type and 2-3 tips", () => {
        for (const e of EXERCISE_CATALOG) {
            expect(e.nameEs.trim()).not.toBe("");
            expect(MUSCLE_GROUPS).toContain(e.muscleGroup);
            expect(["compound", "isolation"]).toContain(e.type);
            expect(typeof e.isBodyweight).toBe("boolean");
            expect(e.tipsEs.length).toBeGreaterThanOrEqual(2);
            expect(e.tipsEs.length).toBeLessThanOrEqual(3);
            e.tipsEs.forEach((t) => expect(t.trim()).not.toBe(""));
        }
    });

    it("covers every muscle group", () => {
        const groups = new Set(EXERCISE_CATALOG.map((e) => e.muscleGroup));
        MUSCLE_GROUPS.forEach((g) => expect(groups.has(g as never)).toBe(true));
    });

    it("flags the classic bodyweight lifts", () => {
        for (const id of ["pull-up", "push-up", "dips"]) {
            expect(getCatalogExercise(id)?.isBodyweight).toBe(true);
        }
        expect(getCatalogExercise("bench-press")?.isBodyweight).toBe(false);
    });
});

describe("getCatalogExercise", () => {
    it("returns the entry by id", () => {
        expect(getCatalogExercise("back-squat")?.id).toBe("back-squat");
    });

    it("returns undefined for unknown ids", () => {
        expect(getCatalogExercise("nope")).toBeUndefined();
    });
});

describe("searchCatalog", () => {
    it("is case-insensitive", () => {
        const ids = searchCatalog("SENTADILLA").map((e) => e.id);
        expect(ids).toContain("back-squat");
    });

    it("is accent-insensitive in both directions", () => {
        const withoutAccent = searchCatalog("triceps").map((e) => e.id);
        const withAccent = searchCatalog("tríceps").map((e) => e.id);
        expect(withoutAccent.length).toBeGreaterThan(0);
        expect(withoutAccent).toEqual(withAccent);
    });

    it("matches substrings of the Spanish name", () => {
        expect(searchCatalog("banca").map((e) => e.id)).toContain("bench-press");
    });

    it("returns every entry for an empty query and none for a miss", () => {
        expect(searchCatalog("  ")).toHaveLength(EXERCISE_CATALOG.length);
        expect(searchCatalog("zzzz")).toEqual([]);
    });
});

describe("resolveLegacyExerciseName", () => {
    it("resolves a catalog name ignoring case, accents and spacing", () => {
        const entry = getCatalogExercise("bench-press")!;
        expect(resolveLegacyExerciseName(`  ${entry.nameEs.toUpperCase()} `)).toBe("bench-press");
    });

    it("resolves aliases", () => {
        expect(resolveLegacyExerciseName("Dominadas")).toBe("pull-up");
        expect(resolveLegacyExerciseName("sentadilla SMITH")).toBe("smith-squat");
    });

    it("returns null when nothing matches", () => {
        expect(resolveLegacyExerciseName("Ejercicio inventado")).toBeNull();
        expect(resolveLegacyExerciseName("")).toBeNull();
    });
});

describe("default routines use the catalog", () => {
    it("resolves every default exercise name to a catalog id", () => {
        for (const routine of DEFAULT_ROUTINES) {
            for (const day of routine.days) {
                for (const ex of day.exercises) {
                    expect(resolveLegacyExerciseName(ex.name)).not.toBeNull();
                }
            }
        }
    });

    it("references existing catalog ids that match the legacy name", () => {
        for (const routine of DEFAULT_ROUTINES) {
            for (const day of routine.days) {
                for (const ex of day.exercises) {
                    expect(getCatalogExercise(ex.catalogId)).toBeDefined();
                    expect(resolveLegacyExerciseName(ex.name)).toBe(ex.catalogId);
                }
            }
        }
    });
});
