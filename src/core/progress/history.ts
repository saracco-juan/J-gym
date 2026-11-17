/**
 * Exercise history: what the logs say about one exercise over time. Pure.
 *
 * An exercise is addressed by a history key: its ref id, else the catalog id
 * its legacy name resolves to, else its exercise id (`exerciseHistoryKey`).
 * Logs are matched with the same key space as personal records, plus the
 * exercise id for legacy rows that never had a ref.
 */

import { resolveLegacyExerciseName } from "../catalog";
import type { ExerciseRef } from "../catalog/types";
import type { IExercise } from "../domain/exercises";
import type { ExerciseLogStatus } from "../domain/log-status";
import type { IWorkoutExercise, IWorkoutLog } from "../domain/workout-log";
import { exerciseKey } from "../use-cases/detect-personal-records";
import { chronological } from "./chronological";

/** One session of an exercise. */
export interface ExerciseSession {
    /** ISO date (YYYY-MM-DD) of the workout. */
    date: string;
    logId: string;
    /** Heaviest weight of the session, 0 when no weight was logged. */
    bestWeight: number;
    /** Most reps in a set at the best weight. */
    bestReps: number;
    /** Sum of reps x weight over every set. */
    volume: number;
    /** Null for legacy entries that carry no status. */
    status: ExerciseLogStatus | null;
}

export interface PersonalRecord {
    weight: number;
    reps: number;
    date: string;
}

export interface ProgressPoint {
    date: string;
    value: number;
}

export interface ProgressSeries {
    /** What the points measure: weight, or reps for exercises never weighted. */
    metric: "weight" | "reps";
    points: ProgressPoint[];
}

/** Key that addresses the exercise's history, usable in a link. */
export function exerciseHistoryKey(item: { exercise: IExercise; ref?: ExerciseRef }): string {
    if (item.ref) return item.ref.id;
    return resolveLegacyExerciseName(item.exercise.name) ?? item.exercise.id;
}

function matchesKey(ex: IWorkoutExercise, key: string): boolean {
    return exerciseKey(ex) === key || (ex.ref === undefined && ex.exercise.id === key);
}

// When one log holds the exercise twice (e.g. a replaced and an added entry),
// the session takes the best outcome.
const STATUS_RANK: Record<ExerciseLogStatus, number> = {
    completed: 5,
    failed: 4,
    added: 3,
    replaced: 2,
    skipped: 1,
};

function mergeStatus(
    current: ExerciseLogStatus | null,
    next: ExerciseLogStatus | undefined
): ExerciseLogStatus | null {
    if (!next) return current;
    if (!current) return next;
    return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

function summarize(log: IWorkoutLog, entries: IWorkoutExercise[]): ExerciseSession {
    const sets = entries.flatMap((e) => e.sets);
    const bestWeight = Math.max(0, ...sets.map((s) => s.actualWeight));
    const bestReps = Math.max(
        0,
        ...sets.filter((s) => s.actualWeight === bestWeight).map((s) => s.actualReps)
    );
    return {
        date: log.date,
        logId: log.id,
        bestWeight,
        bestReps,
        volume: sets.reduce((sum, s) => sum + s.actualReps * s.actualWeight, 0),
        status: entries.reduce<ExerciseLogStatus | null>((acc, e) => mergeStatus(acc, e.status), null),
    };
}

/** Every session of the exercise, oldest first. `logs` may come in any order. */
export function buildExerciseHistory(
    logs: readonly IWorkoutLog[],
    key: string
): ExerciseSession[] {
    const sessions: ExerciseSession[] = [];
    for (const log of chronological(logs)) {
        const entries = log.exercises.filter((e) => matchesKey(e, key));
        if (entries.length > 0) sessions.push(summarize(log, entries));
    }
    return sessions;
}

/**
 * Best weight ever lifted with the reps of that set. Ties go to the earliest
 * session, like `detectPersonalRecords` (a PR must be strictly above). With no
 * weight at all, the most reps. Null when nothing was ever logged.
 */
export function findPersonalRecord(sessions: readonly ExerciseSession[]): PersonalRecord | null {
    let best: ExerciseSession | null = null;
    for (const s of sessions) {
        if (s.bestWeight <= 0 && s.bestReps <= 0) continue;
        if (
            best === null ||
            s.bestWeight > best.bestWeight ||
            // Without weight on either side, reps decide.
            (s.bestWeight === 0 && best.bestWeight === 0 && s.bestReps > best.bestReps)
        ) {
            best = s;
        }
    }
    return best ? { weight: best.bestWeight, reps: best.bestReps, date: best.date } : null;
}

/**
 * Chart data: the best weight of each session over time, or the best reps
 * when the exercise never carried weight. Sessions without a logged value
 * (skipped, replaced) are left out.
 */
export function buildProgressSeries(sessions: readonly ExerciseSession[]): ProgressSeries {
    const weighted = sessions.some((s) => s.bestWeight > 0);
    const repsOnly = !weighted && sessions.some((s) => s.bestReps > 0);
    const metric = repsOnly ? "reps" : "weight";
    const points = sessions
        .map((s) => ({ date: s.date, value: repsOnly ? s.bestReps : s.bestWeight }))
        .filter((p) => p.value > 0);
    return { metric, points };
}
