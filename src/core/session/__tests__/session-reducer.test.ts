import { reduceSession, sessionReducer } from "../session-reducer";
import { createSession, needsFirstInput } from "../session-state";
import { deriveExerciseStatus } from "../derive-exercise-status";
import type { SessionExercise, SessionState } from "../types";
import type { IRoutineExercise } from "../../domain/routine-template";

function plan(
    id: string,
    name: string,
    catalogId: string,
    reps: number,
    weight: number,
    sets = 3
): IRoutineExercise {
    return {
        exercise: { id, name },
        ref: { source: "catalog", id: catalogId },
        sets: Array.from({ length: sets }, (_, i) => ({
            setNumber: i + 1,
            targetReps: reps,
            targetWeight: weight,
        })),
    };
}

function baseSession(): SessionState {
    return createSession([
        plan("bench", "Press banca", "bench-press", 8, 60),
        plan("pullup", "Dominadas", "pull-up", 8, 0),
        plan("seed", "Remo", "seated-cable-row", 0, 0, 0),
    ]);
}

function get(state: SessionState, key: string): SessionExercise {
    const ex = state.exercises.find((e) => e.key === key);
    if (!ex) throw new Error(`missing ${key}`);
    return ex;
}

describe("completeSetAsPlanned", () => {
    it("logs the target reps and weight in one action", () => {
        const { state, rejected } = reduceSession(baseSession(), {
            type: "completeSetAsPlanned",
            exerciseKey: "bench",
            setNumber: 1,
        });
        expect(rejected).toBeNull();
        expect(get(state, "bench").sets[0].logged).toEqual({ reps: 8, weight: 60 });
        expect(get(state, "bench").sets[1].logged).toBeNull();
    });

    it("does not mutate the previous state", () => {
        const before = baseSession();
        const snapshot = JSON.parse(JSON.stringify(before));
        sessionReducer(before, { type: "completeSetAsPlanned", exerciseKey: "bench", setNumber: 1 });
        expect(before).toEqual(snapshot);
    });

    it("logs bodyweight sets with zero weight", () => {
        const { state, rejected } = reduceSession(baseSession(), {
            type: "completeSetAsPlanned",
            exerciseKey: "pullup",
            setNumber: 1,
        });
        expect(rejected).toBeNull();
        expect(get(state, "pullup").sets[0].logged).toEqual({ reps: 8, weight: 0 });
    });

    it("rejects zero target weight on a non-bodyweight exercise", () => {
        const start = createSession([plan("bench", "Press banca", "bench-press", 8, 0)]);
        const result = reduceSession(start, {
            type: "completeSetAsPlanned",
            exerciseKey: "bench",
            setNumber: 1,
        });
        expect(result.rejected).toBe("needs-first-input");
        expect(result.state).toBe(start);
        expect(needsFirstInput(get(start, "bench"))).toBe(true);
    });

    it("rejects zero target reps", () => {
        const start = createSession([plan("bench", "Press banca", "bench-press", 0, 60)]);
        const result = reduceSession(start, {
            type: "completeSetAsPlanned",
            exerciseKey: "bench",
            setNumber: 1,
        });
        expect(result.rejected).toBe("needs-first-input");
        expect(result.state).toBe(start);
    });

    it("rejects unknown exercises and sets without changing state", () => {
        const start = baseSession();
        expect(
            reduceSession(start, { type: "completeSetAsPlanned", exerciseKey: "x", setNumber: 1 })
        ).toEqual({ state: start, rejected: "unknown-exercise" });
        expect(
            reduceSession(start, { type: "completeSetAsPlanned", exerciseKey: "bench", setNumber: 9 })
        ).toEqual({ state: start, rejected: "unknown-set" });
    });

    it("clears the skipped flag when a set is logged", () => {
        let state = sessionReducer(baseSession(), { type: "skipExercise", exerciseKey: "bench" });
        state = sessionReducer(state, {
            type: "completeSetAsPlanned",
            exerciseKey: "bench",
            setNumber: 1,
        });
        expect(get(state, "bench").skipped).toBe(false);
    });
});

describe("completeAllAsPlanned", () => {
    it("logs every set as planned and the exercise becomes completed", () => {
        const state = sessionReducer(baseSession(), {
            type: "completeAllAsPlanned",
            exerciseKey: "bench",
        });
        expect(get(state, "bench").sets.map((s) => s.logged)).toEqual([
            { reps: 8, weight: 60 },
            { reps: 8, weight: 60 },
            { reps: 8, weight: 60 },
        ]);
        expect(deriveExerciseStatus(get(state, "bench"))).toBe("completed");
    });

    it("keeps sets the user already logged with custom values", () => {
        let state = sessionReducer(baseSession(), {
            type: "logSet",
            exerciseKey: "bench",
            setNumber: 1,
            reps: 6,
            weight: 62.5,
        });
        state = sessionReducer(state, { type: "completeAllAsPlanned", exerciseKey: "bench" });
        expect(get(state, "bench").sets[0].logged).toEqual({ reps: 6, weight: 62.5 });
        expect(get(state, "bench").sets[2].logged).toEqual({ reps: 8, weight: 60 });
    });

    it("is rejected when the exercise needs first input", () => {
        const start = baseSession();
        const result = reduceSession(start, { type: "completeAllAsPlanned", exerciseKey: "seed" });
        expect(result.rejected).toBe("needs-first-input");
        expect(result.state).toBe(start);
    });
});

describe("logSet", () => {
    it("logs custom reps and weight on an existing set", () => {
        const state = sessionReducer(baseSession(), {
            type: "logSet",
            exerciseKey: "bench",
            setNumber: 2,
            reps: 7,
            weight: 62.5,
        });
        expect(get(state, "bench").sets[1].logged).toEqual({ reps: 7, weight: 62.5 });
    });

    it("overwrites a previously logged set", () => {
        let state = sessionReducer(baseSession(), {
            type: "completeSetAsPlanned",
            exerciseKey: "bench",
            setNumber: 1,
        });
        state = sessionReducer(state, {
            type: "logSet",
            exerciseKey: "bench",
            setNumber: 1,
            reps: 5,
            weight: 60,
        });
        expect(get(state, "bench").sets[0].logged).toEqual({ reps: 5, weight: 60 });
    });

    it("appends an unplanned set when the set number does not exist", () => {
        const state = sessionReducer(baseSession(), {
            type: "logSet",
            exerciseKey: "seed",
            setNumber: 1,
            reps: 10,
            weight: 30,
        });
        expect(get(state, "seed").sets).toEqual([
            { setNumber: 1, targetReps: 0, targetWeight: 0, planned: false, logged: { reps: 10, weight: 30 } },
        ]);
    });

    it("rejects appending a set that skips numbers", () => {
        const start = baseSession();
        const result = reduceSession(start, {
            type: "logSet",
            exerciseKey: "seed",
            setNumber: 3,
            reps: 10,
            weight: 30,
        });
        expect(result.rejected).toBe("unknown-set");
    });

    it.each([
        ["negative reps", -1, 10],
        ["negative weight", 5, -1],
        ["NaN reps", Number.NaN, 10],
        ["infinite weight", 5, Number.POSITIVE_INFINITY],
        ["fractional reps", 5.5, 10],
    ])("rejects %s", (_label, reps, weight) => {
        const start = baseSession();
        const result = reduceSession(start, {
            type: "logSet",
            exerciseKey: "bench",
            setNumber: 1,
            reps,
            weight,
        });
        expect(result.rejected).toBe("invalid-input");
        expect(result.state).toBe(start);
    });

    it("rejects logging on a replaced exercise", () => {
        const start = sessionReducer(baseSession(), {
            type: "replaceExercise",
            exerciseKey: "bench",
            newKey: "r1",
            exercise: { ref: { source: "catalog", id: "dumbbell-bench-press" }, name: "Press de pecho con mancuernas", isBodyweight: false },
        });
        const result = reduceSession(start, {
            type: "logSet",
            exerciseKey: "bench",
            setNumber: 1,
            reps: 8,
            weight: 60,
        });
        expect(result.rejected).toBe("exercise-replaced");
    });
});

describe("clearSet", () => {
    it("removes the logged values of a planned set but keeps the set", () => {
        let state = sessionReducer(baseSession(), {
            type: "completeAllAsPlanned",
            exerciseKey: "bench",
        });
        state = sessionReducer(state, { type: "clearSet", exerciseKey: "bench", setNumber: 2 });
        expect(get(state, "bench").sets).toHaveLength(3);
        expect(get(state, "bench").sets[1].logged).toBeNull();
        expect(deriveExerciseStatus(get(state, "bench"))).toBe("failed");
    });

    it("removes an unplanned set entirely", () => {
        let state = sessionReducer(baseSession(), {
            type: "logSet",
            exerciseKey: "seed",
            setNumber: 1,
            reps: 10,
            weight: 30,
        });
        state = sessionReducer(state, { type: "clearSet", exerciseKey: "seed", setNumber: 1 });
        expect(get(state, "seed").sets).toEqual([]);
    });

    it("rejects an unknown set", () => {
        const start = baseSession();
        expect(
            reduceSession(start, { type: "clearSet", exerciseKey: "bench", setNumber: 9 }).rejected
        ).toBe("unknown-set");
    });
});

describe("skipExercise", () => {
    it("marks the exercise skipped and discards logged sets", () => {
        let state = sessionReducer(baseSession(), {
            type: "completeSetAsPlanned",
            exerciseKey: "bench",
            setNumber: 1,
        });
        state = sessionReducer(state, { type: "skipExercise", exerciseKey: "bench" });
        const ex = get(state, "bench");
        expect(ex.skipped).toBe(true);
        expect(ex.sets.every((s) => s.logged === null)).toBe(true);
        expect(deriveExerciseStatus(ex)).toBe("skipped");
    });

    it("is rejected for a replaced exercise", () => {
        const start = sessionReducer(baseSession(), {
            type: "replaceExercise",
            exerciseKey: "bench",
            newKey: "r1",
            exercise: { ref: { source: "catalog", id: "dumbbell-bench-press" }, name: "Press de pecho con mancuernas", isBodyweight: false },
        });
        expect(
            reduceSession(start, { type: "skipExercise", exerciseKey: "bench" }).rejected
        ).toBe("exercise-replaced");
    });
});

describe("replaceExercise", () => {
    const DB_PRESS = {
        ref: { source: "catalog", id: "dumbbell-bench-press" } as const,
        name: "Press de pecho con mancuernas",
        isBodyweight: false,
    };

    it("marks the original replaced and inserts the replacement right after it", () => {
        const state = sessionReducer(baseSession(), {
            type: "replaceExercise",
            exerciseKey: "bench",
            newKey: "r1",
            exercise: DB_PRESS,
        });
        expect(state.exercises.map((e) => e.key)).toEqual(["bench", "r1", "pullup", "seed"]);
        expect(get(state, "bench").replacedBy).toBe("r1");
        expect(deriveExerciseStatus(get(state, "bench"))).toBe("replaced");
        expect(get(state, "r1")).toMatchObject({
            origin: "replacement",
            plannedExerciseId: "bench",
            ref: DB_PRESS.ref,
            name: DB_PRESS.name,
            replacedBy: null,
        });
    });

    it("keeps the set count and reps but resets the weight, so it needs first input", () => {
        const state = sessionReducer(baseSession(), {
            type: "replaceExercise",
            exerciseKey: "bench",
            newKey: "r1",
            exercise: DB_PRESS,
        });
        const replacement = get(state, "r1");
        expect(replacement.sets.map((s) => [s.targetReps, s.targetWeight])).toEqual([
            [8, 0],
            [8, 0],
            [8, 0],
        ]);
        expect(replacement.sets.every((s) => s.planned && s.logged === null)).toBe(true);
        expect(needsFirstInput(replacement)).toBe(true);
    });

    it("discards sets already logged on the original", () => {
        let state = sessionReducer(baseSession(), {
            type: "completeSetAsPlanned",
            exerciseKey: "bench",
            setNumber: 1,
        });
        state = sessionReducer(state, {
            type: "replaceExercise",
            exerciseKey: "bench",
            newKey: "r1",
            exercise: DB_PRESS,
        });
        expect(get(state, "bench").sets.every((s) => s.logged === null)).toBe(true);
    });

    it("logs the replacement's sets against the replacement only", () => {
        let state = sessionReducer(baseSession(), {
            type: "replaceExercise",
            exerciseKey: "bench",
            newKey: "r1",
            exercise: DB_PRESS,
        });
        state = sessionReducer(state, {
            type: "logSet",
            exerciseKey: "r1",
            setNumber: 1,
            reps: 10,
            weight: 24,
        });
        expect(get(state, "r1").sets[0].logged).toEqual({ reps: 10, weight: 24 });
        expect(get(state, "bench").sets.every((s) => s.logged === null)).toBe(true);
        expect(deriveExerciseStatus(get(state, "r1"))).toBe("added");
    });

    it("replacing a replacement swaps it in place and keeps linking to the planned one", () => {
        let state = sessionReducer(baseSession(), {
            type: "replaceExercise",
            exerciseKey: "bench",
            newKey: "r1",
            exercise: DB_PRESS,
        });
        state = sessionReducer(state, {
            type: "replaceExercise",
            exerciseKey: "r1",
            newKey: "r2",
            exercise: {
                ref: { source: "catalog", id: "push-up" },
                name: "Flexiones de brazos",
                isBodyweight: true,
            },
        });
        expect(state.exercises.map((e) => e.key)).toEqual(["bench", "r2", "pullup", "seed"]);
        expect(get(state, "bench").replacedBy).toBe("r2");
        expect(get(state, "r2").plannedExerciseId).toBe("bench");
        expect(get(state, "r2").isBodyweight).toBe(true);
    });

    it("rejects replacing an added exercise", () => {
        const start = sessionReducer(baseSession(), {
            type: "addExercise",
            key: "add1",
            exercise: DB_PRESS,
        });
        expect(
            reduceSession(start, {
                type: "replaceExercise",
                exerciseKey: "add1",
                newKey: "r1",
                exercise: DB_PRESS,
            }).rejected
        ).toBe("not-replaceable");
    });

    it("rejects an unknown exercise and a duplicate key", () => {
        const start = baseSession();
        expect(
            reduceSession(start, {
                type: "replaceExercise",
                exerciseKey: "nope",
                newKey: "r1",
                exercise: DB_PRESS,
            }).rejected
        ).toBe("unknown-exercise");
        expect(
            reduceSession(start, {
                type: "replaceExercise",
                exerciseKey: "bench",
                newKey: "pullup",
                exercise: DB_PRESS,
            }).rejected
        ).toBe("duplicate-key");
    });
});

describe("addExercise", () => {
    const LATERAL = {
        ref: { source: "catalog", id: "lateral-raise" } as const,
        name: "Vuelo lateral",
        isBodyweight: false,
    };

    it("appends an exercise with origin added and no planned sets", () => {
        const state = sessionReducer(baseSession(), {
            type: "addExercise",
            key: "add1",
            exercise: LATERAL,
        });
        const added = state.exercises[state.exercises.length - 1];
        expect(added).toMatchObject({ key: "add1", origin: "added", replacedBy: null, sets: [] });
        expect(needsFirstInput(added)).toBe(true);
    });

    it("accepts initial target sets", () => {
        const state = sessionReducer(baseSession(), {
            type: "addExercise",
            key: "add1",
            exercise: LATERAL,
            sets: [{ setNumber: 1, targetReps: 12, targetWeight: 8 }],
        });
        expect(get(state, "add1").sets).toEqual([
            { setNumber: 1, targetReps: 12, targetWeight: 8, planned: true, logged: null },
        ]);
    });

    it("becomes status added once a set is logged", () => {
        let state = sessionReducer(baseSession(), {
            type: "addExercise",
            key: "add1",
            exercise: LATERAL,
        });
        state = sessionReducer(state, {
            type: "logSet",
            exerciseKey: "add1",
            setNumber: 1,
            reps: 12,
            weight: 8,
        });
        expect(deriveExerciseStatus(get(state, "add1"))).toBe("added");
    });

    it("rejects a duplicate key", () => {
        const start = baseSession();
        expect(
            reduceSession(start, { type: "addExercise", key: "bench", exercise: LATERAL }).rejected
        ).toBe("duplicate-key");
    });
});
