/**
 * Screen-level reads and writes over the local repositories. Everything the
 * dashboard, onboarding and workout screens need, so none of them goes
 * through the network. All reads are scoped by user id.
 */

import type { IRoutineExercise, IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import { dayNameForDate, isPastDate } from "@/core/schedule";
import { computePersonalBests } from "@/core/use-cases";
import type { LocalRepositories } from "./localRepositories";

export type DayDataResult =
    | { type: "template"; data: IRoutineTemplate }
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

/** Past days show the logged workout; today and future days show the plan. */
export async function loadDayData(
    repos: LocalRepositories,
    userId: string,
    dateStr: string,
    todayStr: string
): Promise<DayDataResult> {
    try {
        if (isPastDate(dateStr, todayStr)) {
            const log = await repos.workoutLogs.getByDate(userId, dateStr);
            return log ? { type: "log", data: log } : { type: "empty", data: null };
        }
        const template = await repos.routines.getByDay(userId, dayNameForDate(dateStr));
        return template ? { type: "template", data: template } : { type: "empty", data: null };
    } catch {
        return { type: "error", error: "No se pudieron cargar los datos del día." };
    }
}

/** Personal bests keyed by exercise id (see `computePersonalBests`). */
export async function loadPersonalBests(
    repos: LocalRepositories,
    userId: string
): Promise<Record<string, number>> {
    return Object.fromEntries(computePersonalBests(await repos.workoutLogs.listByUser(userId)));
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

/** Dev reset: removes the user's data locally and queues the deletes for the server. */
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
