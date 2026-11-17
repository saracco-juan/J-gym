/**
 * Dashboard day view decision. Pure: no framework or storage imports.
 *
 * Decides what the dashboard shows for the selected date. Once a workout is
 * logged for today the day is locked (the log is shown, the routine can no
 * longer be started again).
 */

import { isPastDate } from "../schedule";

export interface DayViewInput {
    /** Selected date, YYYY-MM-DD. */
    dateStr: string;
    /** Today's local date, YYYY-MM-DD. */
    todayStr: string;
    /** A routine exists for the weekday of `dateStr`. */
    hasTemplate: boolean;
    /** A workout log exists for `dateStr`. */
    hasLog: boolean;
    /** An unfinished session of that weekday's routine started today. */
    hasActiveSession: boolean;
}

export type DayViewAction = "start" | "resume" | "future";

export type DayView =
    | { kind: "log" }
    | { kind: "template"; action: DayViewAction }
    | { kind: "empty" };

export function resolveDayView(input: DayViewInput): DayView {
    const { dateStr, todayStr, hasTemplate, hasLog, hasActiveSession } = input;

    // Past days only ever show what was logged.
    if (isPastDate(dateStr, todayStr)) {
        return hasLog ? { kind: "log" } : { kind: "empty" };
    }

    if (dateStr === todayStr) {
        // A finished workout wins over the plan and over any stale session.
        if (hasLog) return { kind: "log" };
        if (!hasTemplate) return { kind: "empty" };
        return { kind: "template", action: hasActiveSession ? "resume" : "start" };
    }

    return hasTemplate ? { kind: "template", action: "future" } : { kind: "empty" };
}
