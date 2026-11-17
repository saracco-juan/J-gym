/**
 * Calendar arithmetic over local date strings (YYYY-MM-DD). Pure and free of
 * timezones: dates are read as plain calendar days and computed in UTC, so
 * daylight saving never shifts a result.
 */

const MS_PER_DAY = 86_400_000;

function toUtc(dateStr: string): number {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
    const date = new Date(ms);
    const y = String(date.getUTCFullYear()).padStart(4, "0");
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** The date `days` after `dateStr` (negative goes back). */
export function addDays(dateStr: string, days: number): string {
    return fromUtc(toUtc(dateStr) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to`: positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
    return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

/** Monday of the week that holds `dateStr` (weeks run Monday to Sunday). */
export function weekStart(dateStr: string): string {
    const weekday = new Date(toUtc(dateStr)).getUTCDay(); // 0 = Sunday
    const sinceMonday = (weekday + 6) % 7;
    return addDays(dateStr, -sinceMonday);
}

/** First day of the month that holds `dateStr`. */
export function monthStart(dateStr: string): string {
    return `${dateStr.slice(0, 7)}-01`;
}
