import { EXERCISE_LOG_STATUSES } from "../domain/log-status";
import type { ExerciseLogStatus } from "../domain";
import type { IWorkoutExercise, IWorkoutLog, IWorkoutSet } from "../domain";
import {
    asArray,
    asNullableString,
    asNumber,
    asRecord,
    asString,
    parseExercise,
    resolveRef,
} from "./coerce";

export const LOG_SCHEMA_VERSION = 2;

export interface WorkoutLogRow {
    id: string;
    user_id: string;
    template_id: string | null;
    date: string;
    exercises: unknown[];
    completed_at: string | null;
    schema_version: number;
}

function setFromRow(raw: unknown): IWorkoutSet {
    const rec = asRecord(raw);
    return {
        setNumber: asNumber(rec.set_number),
        actualReps: asNumber(rec.actual_reps),
        actualWeight: asNumber(rec.actual_weight),
    };
}

function parseStatus(value: unknown): ExerciseLogStatus | undefined {
    return EXERCISE_LOG_STATUSES.find((s) => s === value);
}

/**
 * Legacy rows (schema_version 1) carry no status and no per-set targets, so
 * the real outcome cannot be recovered. Simple rule: an exercise with at
 * least one logged set counts as "completed", one with none as "failed".
 */
function deriveLegacyStatus(sets: IWorkoutSet[]): ExerciseLogStatus {
    return sets.length > 0 ? "completed" : "failed";
}

function exerciseFromRow(raw: unknown): IWorkoutExercise {
    const rec = asRecord(raw);
    const exercise = parseExercise(rec);
    const ref = resolveRef(rec, exercise);
    const sets = asArray(rec.sets).map(setFromRow);
    const planned = asString(rec.planned_exercise_id);
    return {
        exercise,
        ...(ref ? { ref } : {}),
        status: parseStatus(rec.status) ?? deriveLegacyStatus(sets),
        ...(planned !== "" ? { plannedExerciseId: planned } : {}),
        sets,
    };
}

/**
 * Maps a (possibly legacy or malformed) workout_logs row. Never throws.
 * A null `template_id` (template deleted) becomes "".
 */
export function logFromRow(row: unknown): IWorkoutLog {
    const rec = asRecord(row);
    return {
        id: asString(rec.id),
        userId: asString(rec.user_id),
        templateId: asString(rec.template_id),
        date: asString(rec.date),
        exercises: asArray(rec.exercises).map(exerciseFromRow),
        completedAt: asNullableString(rec.completed_at),
    };
}

function exerciseToRow(ex: IWorkoutExercise): Record<string, unknown> {
    return {
        exercise_id: ex.exercise.id,
        exercise_name: ex.exercise.name,
        ...(ex.ref ? { ref: { source: ex.ref.source, id: ex.ref.id } } : {}),
        ...(ex.status ? { status: ex.status } : {}),
        ...(ex.plannedExerciseId ? { planned_exercise_id: ex.plannedExerciseId } : {}),
        sets: ex.sets.map((s) => ({
            set_number: s.setNumber,
            actual_reps: s.actualReps,
            actual_weight: s.actualWeight,
        })),
    };
}

/** Empty `templateId` is written as null (the column is a nullable FK). */
export function logToRow(log: IWorkoutLog): WorkoutLogRow {
    return {
        id: log.id,
        user_id: log.userId,
        template_id: log.templateId === "" ? null : log.templateId,
        date: log.date,
        exercises: log.exercises.map(exerciseToRow),
        completed_at: log.completedAt,
        schema_version: LOG_SCHEMA_VERSION,
    };
}
