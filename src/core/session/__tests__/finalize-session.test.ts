import { finalizeSession, pendingWeightKeys } from "../finalize-session";
import { evaluateSession } from "../evaluate-session";
import { createSession } from "../session-state";
import { sessionReducer } from "../session-reducer";
import type {
    IActualExerciseData,
    IOverloadStrategy,
    IOverloadSuggestion,
    IPlannedExerciseData,
} from "../../strategies/overload-strategy.interface";
import type { IRoutineExercise, IRoutineTemplate } from "../../domain/routine-template";
import type { SessionState } from "../types";

function plan(id: string, name: string, catalogId: string, weight: number): IRoutineExercise {
    return {
        exercise: { id, name },
        ref: { source: "catalog", id: catalogId },
        sets: [1, 2, 3].map((n) => ({ setNumber: n, targetReps: 12, targetWeight: weight })),
    };
}

const routine: IRoutineTemplate = {
    id: "tpl-1",
    userId: "u1",
    dayName: "lunes",
    exercises: [
        plan("bench", "Press banca", "bench-press", 60),
        plan("row", "Remo", "seated-cable-row", 40),
        plan("curl", "Curl barra", "barbell-curl", 20),
    ],
};

/** Returns a canned suggestion per planned weight so each case is explicit. */
class FakeStrategy implements IOverloadStrategy {
    evaluate(planned: IPlannedExerciseData, _actual: IActualExerciseData): IOverloadSuggestion {
        void _actual;
        const weight = planned.sets[0].targetWeight;
        if (weight === 60) {
            return {
                type: "increase_weight",
                nextSets: planned.sets.map((s) => ({ ...s, targetReps: 8 })),
                message: "up",
            };
        }
        if (weight === 40) {
            return {
                type: "progress",
                nextSets: [...planned.sets, { setNumber: 4, targetReps: 8, targetWeight: 40 }],
                message: "progress",
            };
        }
        return { type: "maintain", nextSets: planned.sets, message: "same" };
    }
}

function completedAll(state: SessionState): SessionState {
    return state.exercises.reduce(
        (s, e) => sessionReducer(s, { type: "completeAllAsPlanned", exerciseKey: e.key }),
        state
    );
}

const base = {
    routine,
    userId: "u1",
    logId: "log-1",
    date: "2026-01-05",
    completedAtIso: "2026-01-05T10:00:00.000Z",
    strategy: new FakeStrategy(),
    previousBests: new Map<string, number>(),
};

describe("pendingWeightKeys", () => {
    it("lists the planned exercises that need a manual weight", () => {
        const state = completedAll(createSession(routine.exercises));
        const evaluation = evaluateSession(state, new FakeStrategy());
        expect(pendingWeightKeys(evaluation)).toEqual(["bench"]);
    });
});

describe("finalizeSession", () => {
    const state = completedAll(createSession(routine.exercises));

    it("builds the log from the evaluation, owned by the user and linked to the routine", () => {
        const { log } = finalizeSession({ ...base, state, weightOverrides: { bench: 62.5 } });
        expect(log).toMatchObject({
            id: "log-1",
            userId: "u1",
            templateId: "tpl-1",
            date: "2026-01-05",
            completedAt: "2026-01-05T10:00:00.000Z",
        });
        expect(log.exercises.map((e) => e.exercise.id)).toEqual(["bench", "row", "curl"]);
    });

    it("applies suggestions to the routine and uses the manual weight for increases", () => {
        const { updatedRoutine } = finalizeSession({ ...base, state, weightOverrides: { bench: 62.5 } });
        const byId = Object.fromEntries((updatedRoutine as IRoutineTemplate).exercises.map((e) => [e.exercise.id, e.sets]));
        expect(byId.bench.map((s) => s.targetWeight)).toEqual([62.5, 62.5, 62.5]);
        expect(byId.bench[0].targetReps).toBe(8);
        expect(byId.row).toHaveLength(4);
        expect(byId.curl).toHaveLength(3);
    });

    it("never guesses a weight: an increase without a manual weight leaves that exercise unchanged", () => {
        const { updatedRoutine } = finalizeSession({ ...base, state, weightOverrides: {} });
        const bench = (updatedRoutine as IRoutineTemplate).exercises.find((e) => e.exercise.id === "bench");
        expect(bench?.sets).toEqual(routine.exercises[0].sets);
    });

    it("does not mutate the input routine", () => {
        const snapshot = JSON.parse(JSON.stringify(routine));
        finalizeSession({ ...base, state, weightOverrides: { bench: 70 } });
        expect(routine).toEqual(snapshot);
    });

    it("returns no routine update when nothing was evaluated", () => {
        const skipped = routine.exercises.reduce(
            (s, e) => sessionReducer(s, { type: "skipExercise", exerciseKey: e.exercise.id }),
            createSession(routine.exercises)
        );
        expect(finalizeSession({ ...base, state: skipped, weightOverrides: {} }).updatedRoutine).toBeNull();
    });

    it("reports new personal records against previous bests", () => {
        const withBests = new Map([["bench-press", 100], ["seated-cable-row", 10]]);
        const { newPRs } = finalizeSession({ ...base, state, weightOverrides: {}, previousBests: withBests });
        expect(newPRs).toEqual(["Remo", "Curl barra"]);
    });
});
