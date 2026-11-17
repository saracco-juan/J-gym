import type { ExerciseLogStatus, IWorkoutLog } from "../../domain";
import {
    STAGNATION_SESSIONS,
    findStagnantExercises,
    formatStagnationSuggestion,
    isExerciseStagnant,
    suggestStagnationAction,
} from "../stagnation";

function entry(
    status: ExerciseLogStatus | undefined,
    opts: { id?: string; name?: string; withRef?: boolean } = {}
): IWorkoutLog["exercises"][number] {
    const { id = "bench-press", name = "Press banca", withRef = true } = opts;
    return {
        exercise: { id: `row-${id}`, name },
        ...(withRef ? { ref: { source: "catalog" as const, id } } : {}),
        ...(status ? { status } : {}),
        sets: [{ setNumber: 1, actualReps: 5, actualWeight: 60 }],
    };
}

function log(date: string, exercises: IWorkoutLog["exercises"], id = `log-${date}`): IWorkoutLog {
    return { id, userId: "u1", templateId: "t", date, exercises, completedAt: null };
}

const LEG_PRESS = { id: "leg-press", name: "Prensa de piernas" };

describe("findStagnantExercises", () => {
    it("flags an exercise whose last three sessions all failed", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed")]),
            log("2026-01-04", [entry("failed")]),
            log("2026-01-08", [entry("failed")]),
        ]);
        expect(STAGNATION_SESSIONS).toBe(3);
        expect(stagnant.has("bench-press")).toBe(true);
    });

    it("does not flag with fewer than three sessions", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed")]),
            log("2026-01-04", [entry("failed")]),
        ]);
        expect(stagnant.size).toBe(0);
    });

    it("does not flag when any of the last three sessions was completed", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed")]),
            log("2026-01-04", [entry("completed")]),
            log("2026-01-08", [entry("failed")]),
        ]);
        expect(stagnant.size).toBe(0);
    });

    it("only looks at the most recent three sessions", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("completed")]),
            log("2026-01-04", [entry("failed")]),
            log("2026-01-08", [entry("failed")]),
            log("2026-01-11", [entry("failed")]),
        ]);
        expect(stagnant.has("bench-press")).toBe(true);
    });

    it("clears the flag once a newer session was completed", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed")]),
            log("2026-01-04", [entry("failed")]),
            log("2026-01-08", [entry("failed")]),
            log("2026-01-11", [entry("completed")]),
        ]);
        expect(stagnant.size).toBe(0);
    });

    it("orders by date regardless of the order the logs come in", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-11", [entry("completed")]),
            log("2026-01-01", [entry("failed")]),
            log("2026-01-04", [entry("failed")]),
            log("2026-01-08", [entry("failed")]),
        ]);
        expect(stagnant.size).toBe(0);
    });

    it("ignores skipped, replaced, added and unknown statuses without breaking the streak", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed")]),
            log("2026-01-03", [entry("skipped")]),
            log("2026-01-04", [entry("failed")]),
            log("2026-01-06", [entry("replaced")]),
            log("2026-01-07", [entry("added")]),
            log("2026-01-08", [entry(undefined)]),
            log("2026-01-09", [entry("failed")]),
        ]);
        expect(stagnant.has("bench-press")).toBe(true);
    });

    it("counts a session once when the exercise appears twice in it", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed"), entry("failed")]),
            log("2026-01-04", [entry("failed")]),
        ]);
        expect(stagnant.size).toBe(0);
    });

    it("treats a session as completed when any occurrence of the exercise was completed", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed")]),
            log("2026-01-04", [entry("failed")]),
            log("2026-01-08", [entry("failed"), entry("completed")]),
        ]);
        expect(stagnant.size).toBe(0);
    });

    it("tracks exercises independently", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed"), entry("completed", LEG_PRESS)]),
            log("2026-01-04", [entry("failed"), entry("failed", LEG_PRESS)]),
            log("2026-01-08", [entry("failed"), entry("failed", LEG_PRESS)]),
        ]);
        expect([...stagnant]).toEqual(["bench-press"]);
    });

    it("matches legacy entries without a ref through the catalog name", () => {
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed", { withRef: false })]),
            log("2026-01-04", [entry("failed")]),
            log("2026-01-08", [entry("failed", { withRef: false })]),
        ]);
        expect(stagnant.has("bench-press")).toBe(true);
    });

    it("falls back to the raw name when it matches no catalog entry", () => {
        const legacy = { id: "x", name: "Remo raro", withRef: false };
        const stagnant = findStagnantExercises([
            log("2026-01-01", [entry("failed", legacy)]),
            log("2026-01-04", [entry("failed", legacy)]),
            log("2026-01-08", [entry("failed", legacy)]),
        ]);
        expect(stagnant.has("Remo raro")).toBe(true);
    });

    it("returns an empty set for no logs", () => {
        expect(findStagnantExercises([]).size).toBe(0);
    });
});

describe("isExerciseStagnant", () => {
    const stagnant = new Set(["bench-press", "legacy-row-id"]);

    it("matches by ref id", () => {
        expect(
            isExerciseStagnant(stagnant, {
                exercise: { id: "any", name: "Press banca" },
                ref: { source: "catalog", id: "bench-press" },
            })
        ).toBe(true);
    });

    it("matches a routine exercise without a ref by its catalog name", () => {
        expect(isExerciseStagnant(stagnant, { exercise: { id: "any", name: "Press banca" } })).toBe(true);
    });

    it("matches a routine exercise without a ref by its exercise id", () => {
        expect(isExerciseStagnant(stagnant, { exercise: { id: "legacy-row-id", name: "Remo raro" } })).toBe(true);
    });

    it("is false for other exercises", () => {
        expect(isExerciseStagnant(stagnant, { exercise: { id: "z", name: "Dominadas" } })).toBe(false);
    });
});

describe("suggestStagnationAction", () => {
    it("lowers the weight about 10% rounded to 2.5 kg", () => {
        expect(suggestStagnationAction({ weight: 60, reps: 8, isBodyweight: false })).toEqual({
            kind: "lower-weight",
            from: 60,
            to: 55,
        });
        expect(suggestStagnationAction({ weight: 100, reps: 5, isBodyweight: false })).toEqual({
            kind: "lower-weight",
            from: 100,
            to: 90,
        });
    });

    it("always lowers by at least one step", () => {
        expect(suggestStagnationAction({ weight: 5, reps: 8, isBodyweight: false })).toEqual({
            kind: "lower-weight",
            from: 5,
            to: 2.5,
        });
        expect(suggestStagnationAction({ weight: 20, reps: 8, isBodyweight: false })).toEqual({
            kind: "lower-weight",
            from: 20,
            to: 17.5,
        });
    });

    it("suggests fewer reps for bodyweight work without extra load", () => {
        expect(suggestStagnationAction({ weight: 0, reps: 10, isBodyweight: true })).toEqual({
            kind: "fewer-reps",
            from: 10,
            to: 8,
        });
    });

    it("suggests fewer reps when there is no weight to lower", () => {
        expect(suggestStagnationAction({ weight: 0, reps: 8, isBodyweight: false })).toEqual({
            kind: "fewer-reps",
            from: 8,
            to: 6,
        });
        expect(suggestStagnationAction({ weight: 2.5, reps: 8, isBodyweight: false })).toEqual({
            kind: "fewer-reps",
            from: 8,
            to: 6,
        });
    });

    it("never goes below one rep and returns null when nothing can be lowered", () => {
        expect(suggestStagnationAction({ weight: 0, reps: 2, isBodyweight: true })).toEqual({
            kind: "fewer-reps",
            from: 2,
            to: 1,
        });
        expect(suggestStagnationAction({ weight: 0, reps: 1, isBodyweight: true })).toBeNull();
        expect(suggestStagnationAction({ weight: 0, reps: 0, isBodyweight: true })).toBeNull();
    });

    it("lowers extra load when a bodyweight exercise carries weight", () => {
        expect(suggestStagnationAction({ weight: 20, reps: 8, isBodyweight: true })).toEqual({
            kind: "lower-weight",
            from: 20,
            to: 17.5,
        });
    });
});

describe("formatStagnationSuggestion", () => {
    it("words a weight suggestion in Spanish", () => {
        expect(formatStagnationSuggestion({ kind: "lower-weight", from: 60, to: 55 })).toBe(
            "Prueba bajar de 60kg a 55kg para recuperar el ritmo."
        );
    });

    it("words a reps suggestion in Spanish", () => {
        expect(formatStagnationSuggestion({ kind: "fewer-reps", from: 10, to: 8 })).toBe(
            "Prueba bajar de 10 a 8 repeticiones para recuperar el ritmo."
        );
    });
});
