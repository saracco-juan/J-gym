"use client";

/**
 * Active Workout Store (Zustand)
 *
 * Holds the in-progress workout as a pure `SessionState` from src/core/session
 * and changes it only through the session reducer. The state is mirrored to
 * Dexie (`activeSession`) by `sessionPersistence`, so killing the app
 * mid-workout loses nothing: `restoreWorkout` brings it back.
 *
 * BUSINESS RULE: the weight (kg/lb) is NEVER computed automatically. When the
 * evaluation says "increase_weight", the store waits for the user to type the
 * new weight via confirmNewWeight().
 */

import { create } from "zustand";

import type { IRoutineTemplate } from "@/core/domain";
import { toLocalDateStr } from "@/core/schedule";
import {
    createSession,
    evaluateSession,
    pendingWeightKeys,
    reduceSession,
    type SessionAction,
    type SessionEvaluation,
    type SessionRejection,
    type SessionState,
} from "@/core/session";
import { StandardHypertrophyStrategy } from "@/core/strategies";
import type { ActiveSessionMeta } from "@/infrastructure/local/db";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";

const hypertrophyStrategy = new StandardHypertrophyStrategy();

interface WorkoutState {
    userId: string | null;
    /** Plan the session was started from (kept for display and for finalize). */
    routine: IRoutineTemplate | null;
    session: SessionState | null;
    meta: ActiveSessionMeta | null;
    /** Available after finishWorkout. */
    evaluation: SessionEvaluation | null;
    /** Planned exercise keys waiting for a manually typed weight. */
    pendingWeightUpdates: string[];
    weightOverrides: Record<string, number>;
    isWeightModalOpen: boolean;
    /** True while the finish is being committed: stops session persistence. */
    isFinalizing: boolean;
}

interface WorkoutActions {
    startWorkout: (template: IRoutineTemplate, userId: string) => void;
    /** Loads a persisted session. Resolves false when there is none. */
    restoreWorkout: (userId: string) => Promise<boolean>;
    dispatch: (action: SessionAction) => SessionRejection | null;
    logSet: (exerciseKey: string, setIndex: number, reps: number, weight: number) => void;
    finishWorkout: () => void;
    confirmNewWeight: (exerciseKey: string, manualWeight: number) => void;
    setFinalizing: (value: boolean) => void;
    resetStore: () => void;
}

const initialState: WorkoutState = {
    userId: null,
    routine: null,
    session: null,
    meta: null,
    evaluation: null,
    pendingWeightUpdates: [],
    weightOverrides: {},
    isWeightModalOpen: false,
    isFinalizing: false,
};

export const useWorkoutStore = create<WorkoutState & WorkoutActions>()((set, get) => ({
    ...initialState,

    startWorkout: (template, userId) => {
        const routine = structuredClone(template);
        set({
            ...initialState,
            userId,
            routine,
            session: createSession(routine.exercises),
            meta: {
                templateId: routine.id,
                dayName: routine.dayName,
                date: toLocalDateStr(new Date()),
                startedAt: Date.now(),
                logId: crypto.randomUUID(),
            },
        });
    },

    restoreWorkout: async (userId) => {
        const repos = getLocalRepositories();
        const record = await repos.activeSession.get(userId);
        if (!record || !record.meta) return false;
        const routine = (await repos.routines.get(record.meta.templateId)) ?? {
            id: record.meta.templateId,
            userId,
            dayName: record.meta.dayName,
            exercises: [],
        };
        set({
            ...initialState,
            userId,
            routine,
            session: record.state,
            meta: record.meta,
        });
        return true;
    },

    dispatch: (action) => {
        const { session } = get();
        if (!session) {
            console.warn("[useWorkoutStore] action ignored: no active session.");
            return "unknown-exercise";
        }
        const { state, rejected } = reduceSession(session, action);
        if (rejected) {
            console.warn(`[useWorkoutStore] action rejected: ${rejected}`);
            return rejected;
        }
        set({ session: state });
        return null;
    },

    logSet: (exerciseKey, setIndex, reps, weight) => {
        get().dispatch({
            type: "logSet",
            exerciseKey,
            setNumber: setIndex + 1,
            reps,
            weight,
        });
    },

    finishWorkout: () => {
        const { session } = get();
        if (!session) {
            console.warn("[useWorkoutStore] finishWorkout ignored: no active session.");
            return;
        }
        const evaluation = evaluateSession(session, hypertrophyStrategy);
        const pending = pendingWeightKeys(evaluation);
        set({
            evaluation,
            pendingWeightUpdates: pending,
            weightOverrides: {},
            isWeightModalOpen: pending.length > 0,
        });
    },

    confirmNewWeight: (exerciseKey, manualWeight) => {
        const { pendingWeightUpdates, weightOverrides } = get();
        const remaining = pendingWeightUpdates.filter((k) => k !== exerciseKey);
        set({
            weightOverrides: { ...weightOverrides, [exerciseKey]: manualWeight },
            pendingWeightUpdates: remaining,
            isWeightModalOpen: remaining.length > 0,
        });
    },

    setFinalizing: (value) => set({ isFinalizing: value }),

    resetStore: () => set({ ...initialState }),
}));
