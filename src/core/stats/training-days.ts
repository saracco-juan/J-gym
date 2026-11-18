/**
 * What counts as a scheduled and a trained day. Pure.
 *
 * Simplification: the schedule is the CURRENT set of routine templates, applied
 * to the whole history. Changing the routine therefore changes how past weeks
 * are read (a weekday added today also counts as scheduled in earlier weeks).
 * Logs keep no copy of the schedule they were trained under, so this is the
 * only schedule the device can know.
 */

import type { IRoutineTemplate, IWorkoutLog } from "../domain";
import { effectiveDayName, type DayOverrides } from "../schedule";

/** Weekday names (as stored in `dayName`, lower case) that have training. */
export function scheduledWeekdays(templates: readonly IRoutineTemplate[]): Set<string> {
    return new Set(
        templates.filter((t) => t.exercises.length > 0).map((t) => t.dayName.trim().toLowerCase())
    );
}

/**
 * Whether a date is a scheduled training day: the routine of the weekday the
 * date shows once the week overrides (swapped days) are applied.
 */
export function scheduleFor(
    templates: readonly IRoutineTemplate[],
    overrides: DayOverrides
): (date: string) => boolean {
    const scheduled = scheduledWeekdays(templates);
    return (date) => scheduled.has(effectiveDayName(date, overrides));
}

/** Number of sets actually logged in the workout. */
export function loggedSetCount(log: IWorkoutLog): number {
    return log.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

/** A log counts as a trained day when at least one set was logged. */
export function isTrainedLog(log: IWorkoutLog): boolean {
    return loggedSetCount(log) > 0;
}

/** Dates (YYYY-MM-DD) with at least one trained log. */
export function trainedDates(logs: readonly IWorkoutLog[]): Set<string> {
    return new Set(logs.filter(isTrainedLog).map((l) => l.date));
}
