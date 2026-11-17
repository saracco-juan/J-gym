/**
 * Volume of the current week and progress of the current month. Pure.
 *
 * Both read plain local dates (YYYY-MM-DD) against `today`: the week runs
 * Monday to Sunday and the month is the calendar month. Logs dated after
 * `today` are ignored.
 */

import type { IWorkoutLog } from "../domain";
import { exerciseKey } from "../use-cases/detect-personal-records";
import { addDays, monthStart, weekStart } from "./dates";

export interface MonthlyProgress {
    /** Average gain over the exercises done this month and before it, 1 decimal. */
    pct: number;
    /** True when at least one of those exercises is heavier than before. */
    improved: boolean;
}

/** Sum of reps x weight over the sets logged in the week of `today`. */
export function computeWeeklyVolume(logs: readonly IWorkoutLog[], today: string): number {
    const from = weekStart(today);
    const to = addDays(from, 6);
    let volume = 0;
    for (const log of logs) {
        if (log.date < from || log.date > to || log.date > today) continue;
        for (const ex of log.exercises) {
            for (const set of ex.sets) volume += set.actualReps * set.actualWeight;
        }
    }
    return volume;
}

/**
 * Best weight this calendar month against the best weight before it, per
 * exercise, for the exercises that have both. Bodyweight sets (weight 0) are
 * ignored: there is nothing to compare. A drop counts in the average (it
 * lowers it) but only a rise counts as `improved`.
 */
export function computeMonthlyProgress(
    logs: readonly IWorkoutLog[],
    today: string
): MonthlyProgress {
    const from = monthStart(today);
    const before = new Map<string, number>();
    const during = new Map<string, number>();

    for (const log of logs) {
        if (log.date > today) continue;
        const target = log.date >= from ? during : before;
        for (const ex of log.exercises) {
            const best = Math.max(0, ...ex.sets.map((s) => s.actualWeight));
            if (best <= 0) continue;
            const key = exerciseKey(ex);
            if (best > (target.get(key) ?? 0)) target.set(key, best);
        }
    }

    const gains: number[] = [];
    let improved = false;
    for (const [key, now] of during) {
        const previous = before.get(key);
        if (previous === undefined) continue;
        gains.push((now / previous - 1) * 100);
        if (now > previous) improved = true;
    }
    if (gains.length === 0) return { pct: 0, improved: false };

    const average = gains.reduce((sum, g) => sum + g, 0) / gains.length;
    // `|| 0` turns a rounded -0 into 0.
    return { pct: Math.round(average * 10) / 10 || 0, improved };
}
