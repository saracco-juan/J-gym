import type { IRoutineExercise, IRoutineTemplate, ISetPlan } from "../domain";
import { asArray, asNumber, asRecord, asString, parseExercise, resolveRef } from "./coerce";

export const ROUTINE_SCHEMA_VERSION = 2;

export interface RoutineRow {
    id: string;
    user_id: string;
    day_name: string;
    exercises: unknown[];
    schema_version: number;
}

function setFromRow(raw: unknown): ISetPlan {
    const rec = asRecord(raw);
    return {
        setNumber: asNumber(rec.set_number),
        targetReps: asNumber(rec.target_reps),
        targetWeight: asNumber(rec.target_weight),
    };
}

function exerciseFromRow(raw: unknown): IRoutineExercise {
    const rec = asRecord(raw);
    const exercise = parseExercise(rec);
    const ref = resolveRef(rec, exercise);
    return {
        exercise,
        ...(ref ? { ref } : {}),
        sets: asArray(rec.sets).map(setFromRow),
    };
}

/** Parses the `exercises` JSONB of a routine row. Never throws. */
export function routineExercisesFromRows(json: unknown): IRoutineExercise[] {
    return asArray(json).map(exerciseFromRow);
}

/** Maps a (possibly legacy or malformed) routine_templates row. Never throws. */
export function routineFromRow(row: unknown): IRoutineTemplate {
    const rec = asRecord(row);
    return {
        id: asString(rec.id),
        userId: asString(rec.user_id),
        dayName: asString(rec.day_name),
        exercises: routineExercisesFromRows(rec.exercises),
    };
}

function exerciseToRow(ex: IRoutineExercise): Record<string, unknown> {
    return {
        exercise_id: ex.exercise.id,
        exercise_name: ex.exercise.name,
        ...(ex.ref ? { ref: { source: ex.ref.source, id: ex.ref.id } } : {}),
        sets: ex.sets.map((s) => ({
            set_number: s.setNumber,
            target_reps: s.targetReps,
            target_weight: s.targetWeight,
        })),
    };
}

export function routineToRow(routine: IRoutineTemplate): RoutineRow {
    return {
        id: routine.id,
        user_id: routine.userId,
        day_name: routine.dayName,
        exercises: routine.exercises.map(exerciseToRow),
        schema_version: ROUTINE_SCHEMA_VERSION,
    };
}
