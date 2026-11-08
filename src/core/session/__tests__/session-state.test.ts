import { createSession, needsFirstInput } from "../session-state";
import type { IRoutineExercise } from "../../domain/routine-template";
import type { SessionExercise } from "../types";

function routineExercise(
    id: string,
    name: string,
    sets: [number, number][],
    ref?: IRoutineExercise["ref"]
): IRoutineExercise {
    return {
        exercise: { id, name },
        ref,
        sets: sets.map(([reps, weight], i) => ({
            setNumber: i + 1,
            targetReps: reps,
            targetWeight: weight,
        })),
    };
}

function sessionExercise(overrides: Partial<SessionExercise> = {}): SessionExercise {
    return {
        key: "e1",
        ref: { source: "catalog", id: "bench-press" },
        name: "Press banca",
        isBodyweight: false,
        origin: "planned",
        replacedBy: null,
        skipped: false,
        sets: [
            { setNumber: 1, targetReps: 8, targetWeight: 60, planned: true, logged: null },
        ],
        ...overrides,
    };
}

describe("createSession", () => {
    it("creates one planned exercise per routine exercise keyed by its id", () => {
        const state = createSession([
            routineExercise("a", "Press banca", [[8, 60], [8, 60]], {
                source: "catalog",
                id: "bench-press",
            }),
        ]);
        expect(state.exercises).toHaveLength(1);
        const [ex] = state.exercises;
        expect(ex).toMatchObject({
            key: "a",
            name: "Press banca",
            origin: "planned",
            replacedBy: null,
            skipped: false,
            ref: { source: "catalog", id: "bench-press" },
        });
        expect(ex.sets).toEqual([
            { setNumber: 1, targetReps: 8, targetWeight: 60, planned: true, logged: null },
            { setNumber: 2, targetReps: 8, targetWeight: 60, planned: true, logged: null },
        ]);
    });

    it("takes isBodyweight from the catalog", () => {
        const state = createSession([
            routineExercise("a", "Dominadas", [[8, 0]], { source: "catalog", id: "pull-up" }),
            routineExercise("b", "Press banca", [[8, 60]], { source: "catalog", id: "bench-press" }),
        ]);
        expect(state.exercises.map((e) => e.isBodyweight)).toEqual([true, false]);
    });

    it("resolves legacy rows without ref by name", () => {
        const [ex] = createSession([routineExercise("a", "dominadas", [[8, 0]])]).exercises;
        expect(ex.ref).toEqual({ source: "catalog", id: "pull-up" });
        expect(ex.isBodyweight).toBe(true);
    });

    it("falls back to a custom ref for unresolved legacy names", () => {
        const [ex] = createSession([routineExercise("uuid-1", "Mi ejercicio", [[8, 10]])]).exercises;
        expect(ex.ref).toEqual({ source: "custom", id: "uuid-1" });
        expect(ex.isBodyweight).toBe(false);
    });

    it("keeps seed exercises with no sets as empty exercises", () => {
        const [ex] = createSession([routineExercise("a", "Press banca", [])]).exercises;
        expect(ex.sets).toEqual([]);
    });
});

describe("needsFirstInput", () => {
    it("is false when every planned set has reps and weight", () => {
        expect(needsFirstInput(sessionExercise())).toBe(false);
    });

    it("is true when an exercise has no planned sets (seed)", () => {
        expect(needsFirstInput(sessionExercise({ sets: [] }))).toBe(true);
    });

    it("is true when target reps are zero", () => {
        const ex = sessionExercise({
            sets: [{ setNumber: 1, targetReps: 0, targetWeight: 60, planned: true, logged: null }],
        });
        expect(needsFirstInput(ex)).toBe(true);
    });

    it("is true when a non-bodyweight target weight is zero", () => {
        const ex = sessionExercise({
            sets: [{ setNumber: 1, targetReps: 8, targetWeight: 0, planned: true, logged: null }],
        });
        expect(needsFirstInput(ex)).toBe(true);
    });

    it("accepts zero weight for bodyweight exercises", () => {
        const ex = sessionExercise({
            isBodyweight: true,
            sets: [{ setNumber: 1, targetReps: 8, targetWeight: 0, planned: true, logged: null }],
        });
        expect(needsFirstInput(ex)).toBe(false);
    });

    it("still requires reps for bodyweight exercises", () => {
        const ex = sessionExercise({
            isBodyweight: true,
            sets: [{ setNumber: 1, targetReps: 0, targetWeight: 0, planned: true, logged: null }],
        });
        expect(needsFirstInput(ex)).toBe(true);
    });
});
