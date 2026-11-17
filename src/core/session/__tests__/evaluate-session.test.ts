import { evaluateSession } from "../evaluate-session";
import { createSession } from "../session-state";
import { sessionReducer } from "../session-reducer";
import { StandardHypertrophyStrategy } from "../../strategies/standard-hypertrophy.strategy";
import type {
    IOverloadStrategy,
    IOverloadSuggestion,
    IPlannedExerciseData,
    IActualExerciseData,
} from "../../strategies/overload-strategy.interface";
import type { IRoutineExercise } from "../../domain/routine-template";
import type { SessionAction } from "../session-reducer";
import type { SessionState } from "../types";

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

function run(state: SessionState, ...actions: SessionAction[]): SessionState {
    return actions.reduce(sessionReducer, state);
}

class SpyStrategy implements IOverloadStrategy {
    calls: { planned: IPlannedExerciseData; actual: IActualExerciseData }[] = [];

    evaluate(planned: IPlannedExerciseData, actual: IActualExerciseData): IOverloadSuggestion {
        this.calls.push({ planned, actual });
        return { type: "maintain", nextSets: planned.sets, message: "spy" };
    }
}

const DB_PRESS = {
    ref: { source: "catalog", id: "dumbbell-bench-press" } as const,
    name: "Press de pecho con mancuernas",
    isBodyweight: false,
};

describe("evaluateSession payload", () => {
    const start = createSession([
        plan("bench", "Press banca", "bench-press", 12, 60),
        plan("row", "Remo", "seated-cable-row", 12, 40),
        plan("curl", "Curl barra", "barbell-curl", 12, 20),
    ]);

    it("maps logged sets to results and carries ref, status and ids", () => {
        const state = run(start, { type: "completeAllAsPlanned", exerciseKey: "bench" });
        const { exercises } = evaluateSession(state, new SpyStrategy());
        const bench = exercises.find((e) => e.exercise.id === "bench")!;
        expect(bench).toMatchObject({
            exercise: { id: "bench", name: "Press banca" },
            ref: { source: "catalog", id: "bench-press" },
            status: "completed",
        });
        expect(bench.plannedExerciseId).toBeUndefined();
        expect(bench.sets).toEqual([
            { setNumber: 1, actualReps: 12, actualWeight: 60 },
            { setNumber: 2, actualReps: 12, actualWeight: 60 },
            { setNumber: 3, actualReps: 12, actualWeight: 60 },
        ]);
    });

    it("records partially logged exercises as failed with only the logged sets", () => {
        const state = run(start, {
            type: "completeSetAsPlanned",
            exerciseKey: "row",
            setNumber: 1,
        });
        const { exercises } = evaluateSession(state, new SpyStrategy());
        const row = exercises.find((e) => e.exercise.id === "row")!;
        expect(row.status).toBe("failed");
        expect(row.sets).toEqual([{ setNumber: 1, actualReps: 12, actualWeight: 40 }]);
    });

    it("records skipped exercises with no sets", () => {
        const state = run(start, { type: "skipExercise", exerciseKey: "curl" });
        const { exercises } = evaluateSession(state, new SpyStrategy());
        const curl = exercises.find((e) => e.exercise.id === "curl")!;
        expect(curl.status).toBe("skipped");
        expect(curl.sets).toEqual([]);
    });

    it("keeps session order and includes every planned exercise", () => {
        const { exercises } = evaluateSession(start, new SpyStrategy());
        expect(exercises.map((e) => e.exercise.id)).toEqual(["bench", "row", "curl"]);
        expect(exercises.every((e) => e.status === "skipped")).toBe(true);
    });

    it("links a replacement to its planned exercise and marks the original replaced", () => {
        const state = run(
            start,
            { type: "replaceExercise", exerciseKey: "bench", newKey: "r1", exercise: DB_PRESS },
            { type: "logSet", exerciseKey: "r1", setNumber: 1, reps: 10, weight: 24 }
        );
        const { exercises } = evaluateSession(state, new SpyStrategy());
        const original = exercises.find((e) => e.exercise.id === "bench")!;
        const replacement = exercises.find((e) => e.exercise.id === "r1")!;
        expect(original).toMatchObject({ status: "replaced", sets: [] });
        expect(replacement).toMatchObject({
            status: "added",
            plannedExerciseId: "bench",
            ref: DB_PRESS.ref,
            sets: [{ setNumber: 1, actualReps: 10, actualWeight: 24 }],
        });
    });

    it("includes added exercises with logged sets and drops untouched ones", () => {
        const state = run(
            start,
            { type: "addExercise", key: "add1", exercise: DB_PRESS },
            { type: "addExercise", key: "add2", exercise: DB_PRESS },
            { type: "logSet", exerciseKey: "add1", setNumber: 1, reps: 10, weight: 20 }
        );
        const { exercises } = evaluateSession(state, new SpyStrategy());
        const ids = exercises.map((e) => e.exercise.id);
        expect(ids).toContain("add1");
        expect(ids).not.toContain("add2");
        expect(exercises.find((e) => e.exercise.id === "add1")).toMatchObject({
            status: "added",
        });
    });

    it("drops an unlogged replacement but still marks the original replaced", () => {
        const state = run(start, {
            type: "replaceExercise",
            exerciseKey: "bench",
            newKey: "r1",
            exercise: DB_PRESS,
        });
        const { exercises } = evaluateSession(state, new SpyStrategy());
        expect(exercises.map((e) => e.exercise.id)).toEqual(["bench", "row", "curl"]);
        expect(exercises[0].status).toBe("replaced");
    });
});

describe("evaluateSession overload feeding", () => {
    const start = createSession([
        plan("bench", "Press banca", "bench-press", 12, 60),
        plan("row", "Remo", "seated-cable-row", 12, 40),
        plan("curl", "Curl barra", "barbell-curl", 12, 20),
        plan("seed", "Dominadas", "pull-up", 0, 0, 0),
    ]);

    it("feeds completed and failed exercises only", () => {
        const spy = new SpyStrategy();
        const state = run(
            start,
            { type: "completeAllAsPlanned", exerciseKey: "bench" },
            { type: "completeSetAsPlanned", exerciseKey: "row", setNumber: 1 },
            { type: "skipExercise", exerciseKey: "curl" }
        );
        const { suggestions } = evaluateSession(state, spy);
        expect(Object.keys(suggestions).sort()).toEqual(["bench", "row"]);
        expect(spy.calls).toHaveLength(2);
    });

    it("passes planned targets and the logged sets to the strategy", () => {
        const spy = new SpyStrategy();
        const state = run(start, { type: "completeAllAsPlanned", exerciseKey: "bench" });
        evaluateSession(state, spy);
        expect(spy.calls[0].planned.sets).toEqual([
            { setNumber: 1, targetReps: 12, targetWeight: 60 },
            { setNumber: 2, targetReps: 12, targetWeight: 60 },
            { setNumber: 3, targetReps: 12, targetWeight: 60 },
        ]);
        expect(spy.calls[0].actual.sets).toHaveLength(3);
    });

    it("produces a progress suggestion with the real strategy for a completed 3x12", () => {
        const state = run(start, { type: "completeAllAsPlanned", exerciseKey: "bench" });
        const { suggestions } = evaluateSession(state, new StandardHypertrophyStrategy());
        expect(suggestions.bench.type).toBe("progress");
    });

    it("produces a maintain suggestion for a partially logged exercise", () => {
        const state = run(start, {
            type: "completeSetAsPlanned",
            exerciseKey: "row",
            setNumber: 1,
        });
        const { suggestions } = evaluateSession(state, new StandardHypertrophyStrategy());
        expect(suggestions.row.type).toBe("maintain");
    });

    it("never feeds replacement or added performance to the planned progression", () => {
        const spy = new SpyStrategy();
        const state = run(
            start,
            {
                type: "replaceExercise",
                exerciseKey: "bench",
                newKey: "r1",
                exercise: DB_PRESS,
            },
            { type: "completeAllAsPlanned", exerciseKey: "r1" },
            { type: "logSet", exerciseKey: "r1", setNumber: 1, reps: 12, weight: 30 },
            { type: "logSet", exerciseKey: "r1", setNumber: 2, reps: 12, weight: 30 },
            { type: "logSet", exerciseKey: "r1", setNumber: 3, reps: 12, weight: 30 },
            { type: "addExercise", key: "add1", exercise: DB_PRESS },
            { type: "logSet", exerciseKey: "add1", setNumber: 1, reps: 12, weight: 30 }
        );
        const { suggestions } = evaluateSession(state, spy);
        expect(suggestions).toEqual({});
        expect(spy.calls).toHaveLength(0);
    });

    it("does not feed seed exercises that have no planned sets", () => {
        const spy = new SpyStrategy();
        const state = run(start, {
            type: "logSet",
            exerciseKey: "seed",
            setNumber: 1,
            reps: 8,
            weight: 0,
        });
        const { suggestions, exercises } = evaluateSession(state, spy);
        expect(suggestions.seed).toBeUndefined();
        expect(exercises.find((e) => e.exercise.id === "seed")!.status).toBe("completed");
        expect(spy.calls).toHaveLength(0);
    });

    it("aligns logged sets by set number and stops at the first gap", () => {
        const spy = new SpyStrategy();
        const state = run(
            start,
            { type: "completeSetAsPlanned", exerciseKey: "bench", setNumber: 2 },
            { type: "completeSetAsPlanned", exerciseKey: "bench", setNumber: 3 }
        );
        evaluateSession(state, spy);
        expect(spy.calls[0].actual.sets).toEqual([]);
    });
});

describe("evaluateSession weight below target", () => {
    const start = createSession([plan("row", "Remo", "seated-cable-row", 12, 40)]);
    const lighter = (): SessionState =>
        run(
            start,
            { type: "logSet", exerciseKey: "row", setNumber: 1, reps: 12, weight: 40 },
            { type: "logSet", exerciseKey: "row", setNumber: 2, reps: 12, weight: 35 },
            { type: "logSet", exerciseKey: "row", setNumber: 3, reps: 12, weight: 40 }
        );

    it("forces a maintain suggestion with the current scheme and skips the strategy", () => {
        const spy = new SpyStrategy();
        const { suggestions, exercises } = evaluateSession(lighter(), spy);
        expect(exercises[0].status).toBe("failed");
        expect(spy.calls).toHaveLength(0);
        expect(suggestions.row.type).toBe("maintain");
        expect(suggestions.row.nextSets).toEqual([
            { setNumber: 1, targetReps: 12, targetWeight: 40 },
            { setNumber: 2, targetReps: 12, targetWeight: 40 },
            { setNumber: 3, targetReps: 12, targetWeight: 40 },
        ]);
    });

    it("never yields progress with the real strategy when reps were met at a lower weight", () => {
        const { suggestions } = evaluateSession(lighter(), new StandardHypertrophyStrategy());
        expect(suggestions.row.type).toBe("maintain");
    });

    it("still delegates to the strategy when weight meets or exceeds the target", () => {
        const spy = new SpyStrategy();
        const state = run(start, { type: "completeAllAsPlanned", exerciseKey: "row" });
        evaluateSession(state, spy);
        expect(spy.calls).toHaveLength(1);
    });
});
