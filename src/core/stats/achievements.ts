/**
 * Achievement rules. Pure: each rule returns the date it was earned on, or
 * null while it is still locked. Dates are local calendar days (YYYY-MM-DD).
 *
 * A "full week" is a Monday to Sunday week in which every scheduled training
 * day has a trained log. The schedule is the current routine applied to the
 * whole history (see `training-days.ts`), read through the week overrides.
 */

import type { IRoutineTemplate, IWorkoutLog } from "../domain";
import { buildExerciseHistory } from "../progress";
import { chronological } from "../progress/chronological";
import type { DayOverrides } from "../schedule";
import { exerciseKey } from "../use-cases/detect-personal-records";
import { ACHIEVEMENTS, type AchievementId } from "./achievement-table";
import { addDays, daysBetween, weekStart } from "./dates";
import { isTrainedLog, scheduleFor, scheduledWeekdays, trainedDates } from "./training-days";

export interface AchievementStatus {
    id: AchievementId;
    unlocked: boolean;
    /** Day it was earned, when it can be derived from the logs. */
    unlockedAt: string | null;
}

/** Workouts needed for "ten-workouts". */
export const WORKOUTS_GOAL = 10;
/** Consecutive full weeks needed for "four-weeks-no-miss". */
export const FULL_WEEKS_GOAL = 4;
/** Failed sessions in a row that make an exercise stagnant (mirrors stagnation.ts). */
const PLATEAU_FAILURES = 3;

interface WeekResult {
    /** Day the last scheduled training day of the week was done, null while incomplete. */
    completedOn: string | null;
}

/** Every week from the first trained day to the week of `today`, oldest first. */
function weekResults(
    templates: readonly IRoutineTemplate[],
    logs: readonly IWorkoutLog[],
    today: string,
    overrides: DayOverrides
): WeekResult[] {
    const scheduled = scheduledWeekdays(templates);
    const isScheduled = scheduleFor(templates, overrides);
    const done = trainedDates(logs.filter((l) => l.date <= today));
    if (scheduled.size === 0 || done.size === 0) return [];

    const firstWeek = weekStart([...done].sort()[0]);
    const weeks = daysBetween(firstWeek, weekStart(today)) / 7;
    const results: WeekResult[] = [];
    for (let i = 0; i <= weeks; i++) {
        const monday = addDays(firstWeek, i * 7);
        const days = Array.from({ length: 7 }, (_, d) => addDays(monday, d)).filter(isScheduled);
        const complete = days.length > 0 && days.every((d) => done.has(d));
        results.push({ completedOn: complete ? days[days.length - 1] : null });
    }
    return results;
}

function firstFullWeek(weeks: readonly WeekResult[]): string | null {
    return weeks.find((w) => w.completedOn !== null)?.completedOn ?? null;
}

function fourWeeksNoMiss(weeks: readonly WeekResult[]): string | null {
    let run = 0;
    for (const week of weeks) {
        run = week.completedOn === null ? 0 : run + 1;
        if (run >= FULL_WEEKS_GOAL) return week.completedOn;
    }
    return null;
}

function tenWorkouts(logs: readonly IWorkoutLog[]): string | null {
    return chronological(logs.filter(isTrainedLog))[WORKOUTS_GOAL - 1]?.date ?? null;
}

/**
 * The earliest day a completed session beat the weight of a stagnation: the
 * exercise failed PLATEAU_FAILURES or more performed sessions in a row (the
 * best weight of that run is the stagnation weight) and a later completed
 * session lifted strictly more than it. Once an exercise has been stagnant,
 * any later completed session above that weight counts, even when an earlier
 * completed session ended the run without beating it. Skipped, replaced and
 * added sessions say nothing and are ignored.
 */
function plateauBreaker(logs: readonly IWorkoutLog[]): string | null {
    const keys = new Set(logs.flatMap((l) => l.exercises.map((e) => exerciseKey(e))));
    let earliest: string | null = null;

    for (const key of keys) {
        const sessions = buildExerciseHistory(logs, key).filter(
            (s) => s.status === "completed" || s.status === "failed"
        );
        let failures = 0;
        let runBest = 0;
        // Lowest stagnation weight seen so far: the easiest bar to clear.
        let lowestStagnantBest = Infinity;
        for (const session of sessions) {
            if (session.status === "failed") {
                failures++;
                runBest = failures === 1 ? session.bestWeight : Math.max(runBest, session.bestWeight);
                continue;
            }
            const bar = Math.min(lowestStagnantBest, failures >= PLATEAU_FAILURES ? runBest : Infinity);
            if (session.bestWeight > bar) {
                if (earliest === null || session.date < earliest) earliest = session.date;
                break;
            }
            lowestStagnantBest = bar;
            failures = 0;
        }
    }
    return earliest;
}

export function evaluateAchievements(
    templates: readonly IRoutineTemplate[],
    logs: readonly IWorkoutLog[],
    today: string,
    overrides: DayOverrides = {}
): AchievementStatus[] {
    const weeks = weekResults(templates, logs, today, overrides);
    const earnedOn: Record<AchievementId, string | null> = {
        "first-full-week": firstFullWeek(weeks),
        "ten-workouts": tenWorkouts(logs),
        "four-weeks-no-miss": fourWeeksNoMiss(weeks),
        "plateau-breaker": plateauBreaker(logs),
    };
    return ACHIEVEMENTS.map(({ id }) => ({
        id,
        unlocked: earnedOn[id] !== null,
        unlockedAt: earnedOn[id],
    }));
}
