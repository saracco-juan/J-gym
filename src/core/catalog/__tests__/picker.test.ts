import {
    MUSCLE_GROUPS,
    buildPickerOptions,
    muscleGroupLabel,
    validateCustomExerciseName,
} from "../picker";
import { EXERCISE_CATALOG, normalizeExerciseName } from "../index";
import type { CustomExercise } from "../types";

const custom: CustomExercise[] = [
    { id: "c-1", name: "Remo con mancuerna", muscleGroup: "back", isBodyweight: false },
    { id: "c-2", name: "Flexión diamante", muscleGroup: "chest", isBodyweight: true },
];

describe("buildPickerOptions", () => {
    it("lists the catalog then custom exercises when nothing is filtered", () => {
        const options = buildPickerOptions({ query: "", muscleGroup: null, custom });
        expect(options).toHaveLength(EXERCISE_CATALOG.length + custom.length);
        expect(options[0].ref.source).toBe("catalog");
        expect(options[options.length - 1].ref.source).toBe("custom");
    });

    it("searches accent- and case-insensitively across both sources", () => {
        const options = buildPickerOptions({ query: "FLEXION", muscleGroup: null, custom });
        expect(options.some((o) => o.ref.id === "c-2")).toBe(true);
        expect(options.length).toBeGreaterThan(0);
    });

    it("filters by muscle group", () => {
        const options = buildPickerOptions({ query: "", muscleGroup: "back", custom });
        expect(options.length).toBeGreaterThan(1);
        expect(options.every((o) => o.muscleGroup === "back")).toBe(true);
        expect(options.some((o) => o.ref.id === "c-1")).toBe(true);
        expect(options.some((o) => o.ref.id === "c-2")).toBe(false);
    });

    it("combines query and muscle group", () => {
        const options = buildPickerOptions({ query: "remo", muscleGroup: "back", custom });
        expect(options.length).toBeGreaterThan(0);
        expect(options.every((o) => o.muscleGroup === "back")).toBe(true);
        expect(
            options.every((o) => normalizeExerciseName(o.name).includes("remo") || o.ref.source === "catalog")
        ).toBe(true);
    });

    it("carries the bodyweight flag and source", () => {
        const options = buildPickerOptions({ query: "diamante", muscleGroup: null, custom });
        expect(options).toEqual([
            {
                ref: { source: "custom", id: "c-2" },
                name: "Flexión diamante",
                muscleGroup: "chest",
                isBodyweight: true,
            },
        ]);
    });

    it("hides excluded refs", () => {
        const all = buildPickerOptions({ query: "", muscleGroup: null, custom });
        const excluded = all[0].ref;
        const options = buildPickerOptions({
            query: "",
            muscleGroup: null,
            custom,
            exclude: [excluded],
        });
        expect(options).toHaveLength(all.length - 1);
        expect(
            options.some((o) => o.ref.id === excluded.id && o.ref.source === excluded.source)
        ).toBe(false);
    });

    it("returns nothing when nothing matches", () => {
        expect(buildPickerOptions({ query: "zzzzz", muscleGroup: null, custom })).toEqual([]);
    });
});

describe("muscleGroupLabel", () => {
    it("has a Spanish label for every group", () => {
        expect(MUSCLE_GROUPS).toHaveLength(7);
        expect(muscleGroupLabel("chest")).toBe("Pecho");
        for (const g of MUSCLE_GROUPS) expect(muscleGroupLabel(g).length).toBeGreaterThan(0);
    });
});

describe("validateCustomExerciseName", () => {
    it("trims and accepts a valid name", () => {
        expect(validateCustomExerciseName("  Banco de hiperextensiones lateral  ", custom)).toEqual({
            ok: true,
            name: "Banco de hiperextensiones lateral",
        });
    });

    it("rejects empty names", () => {
        expect(validateCustomExerciseName("   ", custom)).toEqual({ ok: false, reason: "empty" });
    });

    it("rejects names that are too long", () => {
        expect(validateCustomExerciseName("a".repeat(61), custom)).toEqual({
            ok: false,
            reason: "too-long",
        });
    });

    it("rejects duplicates of custom exercises ignoring accents and case", () => {
        expect(validateCustomExerciseName("flexion DIAMANTE", custom)).toEqual({
            ok: false,
            reason: "duplicate",
        });
    });

    it("rejects duplicates of catalog exercises", () => {
        expect(validateCustomExerciseName("sentadilla con barra", [])).toEqual({
            ok: false,
            reason: "duplicate",
        });
    });
});
