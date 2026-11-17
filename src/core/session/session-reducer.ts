import type { ISetPlan } from "../domain/exercises";
import { needsFirstInput } from "./session-state";
import type {
    ExerciseDescriptor,
    LoggedSet,
    SessionExercise,
    SessionSet,
    SessionState,
} from "./types";

export type SessionAction =
    | { type: "completeSetAsPlanned"; exerciseKey: string; setNumber: number }
    | { type: "completeAllAsPlanned"; exerciseKey: string }
    | { type: "logSet"; exerciseKey: string; setNumber: number; reps: number; weight: number }
    | { type: "clearSet"; exerciseKey: string; setNumber: number }
    | { type: "skipExercise"; exerciseKey: string }
    | {
          type: "replaceExercise";
          exerciseKey: string;
          /** Caller-generated unique key for the replacement (keeps the reducer pure). */
          newKey: string;
          exercise: ExerciseDescriptor;
      }
    | {
          type: "addExercise";
          /** Caller-generated unique key for the new exercise. */
          key: string;
          exercise: ExerciseDescriptor;
          sets?: ISetPlan[];
      };

export type SessionRejection =
    | "needs-first-input"
    | "unknown-exercise"
    | "unknown-set"
    | "invalid-input"
    | "not-replaceable"
    | "exercise-replaced"
    | "duplicate-key";

export interface SessionReduction {
    state: SessionState;
    /** Set when the action was refused; `state` is then the unchanged input. */
    rejected: SessionRejection | null;
}

type ExistingExerciseAction = Exclude<
    SessionAction,
    { type: "addExercise" | "replaceExercise" }
>;

const reject = (state: SessionState, rejected: SessionRejection): SessionReduction => ({
    state,
    rejected,
});

const accept = (state: SessionState): SessionReduction => ({ state, rejected: null });

function updateExercise(
    state: SessionState,
    key: string,
    update: (exercise: SessionExercise) => SessionExercise
): SessionState {
    return {
        exercises: state.exercises.map((e) => (e.key === key ? update(e) : e)),
    };
}

/** Logging any set means the user did not skip the exercise. */
function withSets(exercise: SessionExercise, sets: SessionSet[]): SessionExercise {
    return { ...exercise, skipped: false, sets };
}

function isValidInput(reps: number, weight: number): boolean {
    return Number.isInteger(reps) && reps >= 0 && Number.isFinite(weight) && weight >= 0;
}

function toPlannedSets(sets: ISetPlan[] | undefined): SessionSet[] {
    return (sets ?? []).map((s) => ({
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        targetWeight: s.targetWeight,
        planned: true,
        logged: null,
    }));
}

function logAsPlanned(set: SessionSet): SessionSet {
    const logged: LoggedSet = { reps: set.targetReps, weight: set.targetWeight };
    return { ...set, logged };
}

function replaceSet(sets: SessionSet[], setNumber: number, next: SessionSet): SessionSet[] {
    return sets.map((s) => (s.setNumber === setNumber ? next : s));
}

/** Pure reducer. Refused actions return the same state reference plus a reason. */
export function reduceSession(state: SessionState, action: SessionAction): SessionReduction {
    switch (action.type) {
        case "addExercise":
            return addExercise(state, action);
        case "replaceExercise":
            return replaceExercise(state, action);
        default:
            return reduceOnExistingExercise(state, action);
    }
}

/** Plain reducer signature for `useReducer`-style consumers. */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
    return reduceSession(state, action).state;
}

function addExercise(
    state: SessionState,
    action: Extract<SessionAction, { type: "addExercise" }>
): SessionReduction {
    if (state.exercises.some((e) => e.key === action.key)) {
        return reject(state, "duplicate-key");
    }
    const added: SessionExercise = {
        key: action.key,
        ref: action.exercise.ref,
        name: action.exercise.name,
        isBodyweight: action.exercise.isBodyweight,
        origin: "added",
        replacedBy: null,
        skipped: false,
        sets: toPlannedSets(action.sets),
    };
    return accept({ exercises: [...state.exercises, added] });
}

function replaceExercise(
    state: SessionState,
    action: Extract<SessionAction, { type: "replaceExercise" }>
): SessionReduction {
    const target = state.exercises.find((e) => e.key === action.exerciseKey);
    if (!target) return reject(state, "unknown-exercise");
    if (target.origin === "added") return reject(state, "not-replaceable");
    if (state.exercises.some((e) => e.key === action.newKey)) {
        return reject(state, "duplicate-key");
    }

    // Replacing a replacement swaps it in place, still linked to the planned one.
    const original =
        target.origin === "replacement"
            ? state.exercises.find((e) => e.key === target.plannedExerciseId)
            : target;
    if (!original) return reject(state, "unknown-exercise");

    const replacement: SessionExercise = {
        key: action.newKey,
        ref: action.exercise.ref,
        name: action.exercise.name,
        isBodyweight: action.exercise.isBodyweight,
        origin: "replacement",
        plannedExerciseId: original.key,
        replacedBy: null,
        skipped: false,
        // Same scheme (sets and reps); the old weight means nothing for another lift.
        sets: original.sets
            .filter((s) => s.planned)
            .map((s) => ({
                setNumber: s.setNumber,
                targetReps: s.targetReps,
                targetWeight: 0,
                planned: true,
                logged: null,
            })),
    };

    const exercises: SessionExercise[] = [];
    for (const e of state.exercises) {
        if (original.replacedBy !== null && e.key === original.replacedBy) continue;
        if (e.key === original.key) {
            exercises.push({
                ...e,
                replacedBy: replacement.key,
                skipped: false,
                sets: e.sets.map((s) => ({ ...s, logged: null })),
            });
            exercises.push(replacement);
        } else {
            exercises.push(e);
        }
    }
    return accept({ exercises });
}

function reduceOnExistingExercise(
    state: SessionState,
    action: ExistingExerciseAction
): SessionReduction {
    const exercise = state.exercises.find((e) => e.key === action.exerciseKey);
    if (!exercise) return reject(state, "unknown-exercise");
    if (exercise.replacedBy !== null) return reject(state, "exercise-replaced");

    switch (action.type) {
        case "completeSetAsPlanned": {
            const set = exercise.sets.find((s) => s.setNumber === action.setNumber);
            if (!set) return reject(state, "unknown-set");
            if (needsFirstInput(exercise)) return reject(state, "needs-first-input");
            return accept(
                updateExercise(state, exercise.key, (e) =>
                    withSets(e, replaceSet(e.sets, set.setNumber, logAsPlanned(set)))
                )
            );
        }

        case "completeAllAsPlanned": {
            if (needsFirstInput(exercise)) return reject(state, "needs-first-input");
            return accept(
                updateExercise(state, exercise.key, (e) =>
                    withSets(e, e.sets.map((s) => (s.logged ? s : logAsPlanned(s))))
                )
            );
        }

        case "logSet": {
            if (!isValidInput(action.reps, action.weight)) {
                return reject(state, "invalid-input");
            }
            const logged: LoggedSet = { reps: action.reps, weight: action.weight };
            const existing = exercise.sets.find((s) => s.setNumber === action.setNumber);
            if (existing) {
                return accept(
                    updateExercise(state, exercise.key, (e) =>
                        withSets(e, replaceSet(e.sets, existing.setNumber, { ...existing, logged }))
                    )
                );
            }
            if (action.setNumber !== exercise.sets.length + 1) {
                return reject(state, "unknown-set");
            }
            const extra: SessionSet = {
                setNumber: action.setNumber,
                targetReps: 0,
                targetWeight: 0,
                planned: false,
                logged,
            };
            return accept(
                updateExercise(state, exercise.key, (e) => withSets(e, [...e.sets, extra]))
            );
        }

        case "clearSet": {
            const set = exercise.sets.find((s) => s.setNumber === action.setNumber);
            if (!set) return reject(state, "unknown-set");
            return accept(
                updateExercise(state, exercise.key, (e) => ({
                    ...e,
                    sets: set.planned
                        ? replaceSet(e.sets, set.setNumber, { ...set, logged: null })
                        : e.sets.filter((s) => s.setNumber !== set.setNumber),
                }))
            );
        }

        case "skipExercise":
            return accept(
                updateExercise(state, exercise.key, (e) => ({
                    ...e,
                    skipped: true,
                    sets: e.sets.map((s) => ({ ...s, logged: null })),
                }))
            );
    }
}
