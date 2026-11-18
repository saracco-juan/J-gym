/**
 * Swapping routine days within the current week. Pure.
 *
 * An override maps a date (YYYY-MM-DD) of the current week to the weekday
 * name whose routine that date shows. Dates without an override show their
 * natural weekday. Overrides store weekday names, never template ids.
 */

import { dayNameForDate, isPastDate } from "./schedule";

/** date (YYYY-MM-DD) -> weekday name shown on that date. */
export type DayOverrides = Readonly<Record<string, string>>;

export type SwapBlockReason =
    | "same-day"
    | "other-week"
    | "past"
    | "logged"
    | "rest-day"
    | "session-in-progress";

export interface SwapInput {
    a: string;
    b: string;
    today: string;
    overrides: DayOverrides;
    /** Dates that already have a workout log. */
    loggedDates: ReadonlySet<string>;
    /** Weekday names with a non-empty routine. */
    trainingWeekdays: ReadonlySet<string>;
    /** Date of the active workout session, or null when there is none. */
    sessionDate: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(dateStr: string): number {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
    const d = new Date(ms);
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Dates of the week (Monday to Sunday) that contains `today`. */
export function currentWeekDates(today: string): string[] {
    const ms = toUtc(today);
    const offsetFromMonday = (new Date(ms).getUTCDay() + 6) % 7;
    const monday = ms - offsetFromMonday * DAY_MS;
    return Array.from({ length: 7 }, (_, i) => fromUtc(monday + i * DAY_MS));
}

/** Weekday name whose routine `date` shows. */
export function effectiveDayName(date: string, overrides: DayOverrides): string {
    return overrides[date] ?? dayNameForDate(date);
}

/** Why swapping `a` and `b` is not allowed, or null when it is. */
export function swapBlock(input: SwapInput): SwapBlockReason | null {
    const { a, b, today, overrides, loggedDates, trainingWeekdays, sessionDate } = input;
    if (a === b) return "same-day";
    const week = currentWeekDates(today);
    if (!week.includes(a) || !week.includes(b)) return "other-week";
    if (isPastDate(a, today) || isPastDate(b, today)) return "past";
    if (loggedDates.has(a) || loggedDates.has(b)) return "logged";
    // A training day may swap with a rest day; two rest days have nothing to swap.
    if (
        !trainingWeekdays.has(effectiveDayName(a, overrides)) &&
        !trainingWeekdays.has(effectiveDayName(b, overrides))
    ) {
        return "rest-day";
    }
    if (sessionDate === today && (a === today || b === today)) return "session-in-progress";
    return null;
}

/**
 * Swaps the weekdays shown on `a` and `b`. An override equal to the natural
 * weekday of its date is dropped, so swapping back leaves no overrides.
 */
export function applySwap(overrides: DayOverrides, a: string, b: string): Record<string, string> {
    const next: Record<string, string> = { ...overrides };
    const aName = effectiveDayName(a, overrides);
    const bName = effectiveDayName(b, overrides);
    const set = (date: string, name: string) => {
        if (name === dayNameForDate(date)) delete next[date];
        else next[date] = name;
    };
    set(a, bName);
    set(b, aName);
    return next;
}

export type ResetInput = Pick<SwapInput, "today" | "overrides" | "loggedDates" | "sessionDate">;

/**
 * Why the swaps of this week cannot be undone, or null when they can. A
 * swapped day that is past, logged or being trained today keeps its routine,
 * so resetting only part of a swap would leave a routine twice in the week.
 */
export function resetBlock(input: ResetInput): SwapBlockReason | null {
    const { today, overrides, loggedDates, sessionDate } = input;
    const week = currentWeekDates(today);
    const dates = Object.keys(overrides).filter((d) => week.includes(d));
    if (dates.some((d) => isPastDate(d, today))) return "past";
    if (dates.some((d) => loggedDates.has(d))) return "logged";
    if (sessionDate === today && dates.includes(today)) return "session-in-progress";
    return null;
}
