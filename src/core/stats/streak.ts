/**
 * Training streak. Pure.
 *
 * The streak is the run of consecutive SCHEDULED training days that were
 * completed, counted back from the most recent scheduled day up to today:
 * - a scheduled weekday without a trained log breaks it;
 * - rest days (no routine for that weekday) never break it, and a log on one
 *   adds nothing;
 * - today counts only once it is logged: an unlogged today does not break the
 *   streak yet.
 * Several logs on one day count once. Logs dated after today are ignored.
 *
 * Both numbers come from one forward pass from the first trained day to today.
 */

import type { IRoutineTemplate, IWorkoutLog } from "../domain";
import { dayNameForDate } from "../schedule";
import { addDays, daysBetween } from "./dates";
import { scheduledWeekdays, trainedDates } from "./training-days";

export interface Streaks {
    /** Consecutive completed scheduled days up to today. */
    streak: number;
    /** Longest such run in the whole history. */
    bestStreak: number;
}

export function computeStreaks(
    templates: readonly IRoutineTemplate[],
    logs: readonly IWorkoutLog[],
    today: string
): Streaks {
    const scheduled = scheduledWeekdays(templates);
    const done = trainedDates(logs.filter((l) => l.date <= today));
    if (scheduled.size === 0 || done.size === 0) return { streak: 0, bestStreak: 0 };

    // Before the first trained day nothing was completed, so the run is 0 there.
    const first = [...done].sort()[0];
    const span = daysBetween(first, today);

    let run = 0;
    let best = 0;
    for (let offset = 0; offset <= span; offset++) {
        const date = addDays(first, offset);
        if (!scheduled.has(dayNameForDate(date))) continue;
        if (done.has(date)) {
            run++;
            best = Math.max(best, run);
        } else if (date !== today) {
            run = 0;
        }
    }
    return { streak: run, bestStreak: best };
}
