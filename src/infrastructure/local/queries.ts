/**
 * Screen-level reads and writes over the local repositories. Everything the
 * dashboard, onboarding and workout screens need, so none of them goes
 * through the network. All reads are scoped by user id.
 */

import { getCatalogExercise } from "@/core/catalog";
import type { IRoutineExercise, IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import { resolveDayView, type DayViewAction } from "@/core/dashboard";
import { dayNameForDate } from "@/core/schedule";
import { finalizeSession, type FinalizeResult, type SessionState } from "@/core/session";
import type { IOverloadStrategy } from "@/core/strategies";
import {
    buildExerciseHistory,
    buildProgressSeries,
    findPersonalRecord,
    findStagnantExercises,
    isStagnantHistory,
    type ExerciseSession,
    type PersonalRecord,
    type ProgressSeries,
} from "@/core/progress";
import type { RoutineSavePlan } from "@/core/routine";
import { computePersonalBests } from "@/core/use-cases";
import type { ActiveSessionRecord } from "./db";
import type { LocalRepositories } from "./localRepositories";

export type DayDataResult =
    | { type: "template"; data: IRoutineTemplate; action: DayViewAction }
    | { type: "log"; data: IWorkoutLog }
    | { type: "empty"; data: null }
    | { type: "error"; error: string };

export interface WeeklyRoutineInput {
    dayName: string;
    exercises: IRoutineExercise[];
}

export async function hasRoutines(repos: LocalRepositories, userId: string): Promise<boolean> {
    return (await repos.routines.listByUser(userId)).length > 0;
}

/**
 * Past days show the logged workout; future days show the plan. Today shows
 * the plan until its workout is logged, then the log (the day is locked).
 * The view decision itself is the pure `resolveDayView`.
 */
export async function loadDayData(
    repos: LocalRepositories,
    userId: string,
    dateStr: string,
    todayStr: string
): Promise<DayDataResult> {
    try {
        const isFuture = dateStr > todayStr;
        const [plan, log, saved] = await Promise.all([
            repos.routines.getByDay(userId, dayNameForDate(dateStr)),
            // Future days cannot have a log yet.
            isFuture ? undefined : repos.workoutLogs.getByDate(userId, dateStr),
            dateStr === todayStr
                ? repos.activeSession.get(userId).catch(() => undefined)
                : undefined,
        ]);

        const view = resolveDayView({
            dateStr,
            todayStr,
            hasTemplate: !!plan,
            hasLog: !!log,
            // Only a session started today is resumable; an older one is stale.
            hasActiveSession:
                !!plan && saved?.meta?.templateId === plan.id && saved.meta.date === todayStr,
        });

        if (view.kind === "log" && log) return { type: "log", data: log };
        if (view.kind === "template" && plan) {
            return { type: "template", data: plan, action: view.action };
        }
        return { type: "empty", data: null };
    } catch {
        return { type: "error", error: "No se pudieron cargar los datos del día." };
    }
}

/** True when a workout is already logged for the date: that day is finished and locked. */
export async function isDayLocked(
    repos: LocalRepositories,
    userId: string,
    dateStr: string
): Promise<boolean> {
    return (await repos.workoutLogs.getByDate(userId, dateStr)) !== undefined;
}

/**
 * The persisted session to restore, if any. A session whose day already has a
 * log was finished (e.g. on another device, or reached again through back or a
 * bookmark): it is discarded so the workout cannot be started a second time.
 */
export async function loadRestorableSession(
    repos: LocalRepositories,
    userId: string
): Promise<ActiveSessionRecord | undefined> {
    const record = await repos.activeSession.get(userId);
    if (!record?.meta) return record;
    if (await isDayLocked(repos, userId, record.meta.date)) {
        await repos.activeSession.clear(userId);
        return undefined;
    }
    return record;
}

/** Personal bests keyed by exercise id (see `computePersonalBests`). */
export async function loadPersonalBests(
    repos: LocalRepositories,
    userId: string
): Promise<Record<string, number>> {
    return Object.fromEntries(computePersonalBests(await repos.workoutLogs.listByUser(userId)));
}

/** Keys of the exercises whose last three performed sessions all failed (see `findStagnantExercises`). */
export async function loadStagnantExercises(
    repos: LocalRepositories,
    userId: string
): Promise<Set<string>> {
    return findStagnantExercises(await repos.workoutLogs.listByUser(userId));
}

export interface ExerciseHistoryResult {
    name: string;
    isBodyweight: boolean;
    /** Oldest first. */
    sessions: ExerciseSession[];
    record: PersonalRecord | null;
    series: ProgressSeries;
    stagnant: boolean;
}

/**
 * Everything the history screen shows for one exercise, from the local logs.
 * The name comes from the catalog, then the user's custom exercise, then the
 * latest log that mentions it, and finally the key itself.
 */
export async function loadExerciseHistory(
    repos: LocalRepositories,
    userId: string,
    key: string
): Promise<ExerciseHistoryResult> {
    const logs = await repos.workoutLogs.listByUser(userId);
    const sessions = buildExerciseHistory(logs, key);
    const catalog = getCatalogExercise(key);
    const custom = catalog ? undefined : await repos.customExercises.get(key);
    const ownCustom = custom && custom.userId === userId ? custom : undefined;

    let name = catalog?.nameEs ?? ownCustom?.name;
    if (!name) {
        // Sessions are oldest first: the last one carries the latest name.
        const lastLogId = sessions[sessions.length - 1]?.logId;
        const lastLog = logs.find((l) => l.id === lastLogId);
        name = lastLog?.exercises.find((e) => e.ref?.id === key || e.exercise.id === key)?.exercise.name;
    }

    return {
        name: name ?? key,
        isBodyweight: catalog?.isBodyweight ?? ownCustom?.isBodyweight ?? false,
        sessions,
        record: findPersonalRecord(sessions),
        series: buildProgressSeries(sessions),
        stagnant: isStagnantHistory(sessions),
    };
}

/**
 * Onboarding save. A day that already has a routine keeps its id (the server
 * allows one routine per user and day); new days get a client UUID.
 */
export async function saveWeeklyRoutine(
    repos: LocalRepositories,
    userId: string,
    templates: WeeklyRoutineInput[],
    newId: () => string = () => crypto.randomUUID()
): Promise<void> {
    for (const tmpl of templates) {
        const existing = await repos.routines.getByDay(userId, tmpl.dayName);
        await repos.routines.save({
            id: existing?.id ?? newId(),
            userId,
            dayName: tmpl.dayName,
            exercises: tmpl.exercises,
        });
    }
}

export interface RoutineEditorData {
    templates: IRoutineTemplate[];
    /** Routine of the unfinished session, if any: its day must not be deleted. */
    activeTemplateId: string | null;
}

/** What the routine editor starts from, all local. */
export async function loadRoutineEditor(
    repos: LocalRepositories,
    userId: string
): Promise<RoutineEditorData> {
    const [templates, saved] = await Promise.all([
        repos.routines.listByUser(userId),
        repos.activeSession.get(userId).catch(() => undefined),
    ]);
    return { templates, activeTemplateId: saved?.meta?.templateId ?? null };
}

/**
 * Routine editor save: writes each change locally and enqueues it, deletes
 * first. Logs and the in-progress session are never touched.
 */
export async function saveRoutineEdits(
    repos: LocalRepositories,
    plan: RoutineSavePlan
): Promise<void> {
    for (const id of plan.deletes) await repos.routines.remove(id);
    for (const routine of plan.upserts) await repos.routines.save(routine);
}

/** Reset: removes the user's data locally and queues the deletes for the server. */
export async function resetUserData(repos: LocalRepositories, userId: string): Promise<void> {
    for (const log of await repos.workoutLogs.listByUser(userId)) {
        await repos.workoutLogs.remove(log.id);
    }
    for (const routine of await repos.routines.listByUser(userId)) {
        await repos.routines.remove(routine.id);
    }
    for (const ex of await repos.customExercises.listByUser(userId)) {
        await repos.customExercises.remove(ex.id);
    }
    await repos.activeSession.clear(userId);
}

export interface FinishWorkoutInput {
    userId: string;
    /** Session state at finish time. */
    routineId: string;
    /** Session meta of the day: the log id is fixed at start so retries upsert the same log. */
    state: SessionState;
    logId: string;
    date: string;
    completedAtIso: string;
    strategy: IOverloadStrategy;
    weightOverrides: Record<string, number>;
}

/**
 * Finish pipeline against the local database: evaluate (pure) -> save log
 * and overload-updated routine -> clear the active session, all committed
 * in one transaction that also enqueues both for sync. Finishing the same
 * session twice (same `logId`) overwrites the same log.
 */
export async function finishWorkoutLocally(
    repos: LocalRepositories,
    input: FinishWorkoutInput
): Promise<FinalizeResult> {
    const routine: IRoutineTemplate = (await repos.routines.get(input.routineId)) ?? {
        id: input.routineId,
        userId: input.userId,
        dayName: "",
        exercises: [],
    };
    const previousBests = computePersonalBests(
        (await repos.workoutLogs.listByUser(input.userId)).filter((l) => l.id !== input.logId)
    );
    const result = finalizeSession({
        state: input.state,
        routine,
        userId: input.userId,
        logId: input.logId,
        date: input.date,
        completedAtIso: input.completedAtIso,
        strategy: input.strategy,
        weightOverrides: input.weightOverrides,
        previousBests,
    });
    await repos.workoutLogs.commitWorkout(input.userId, result.log, result.updatedRoutine);
    return result;
}
