/**
 * Calendar helpers. Dates are plain YYYY-MM-DD strings in the user's local
 * calendar; `routine_templates.day_name` stores Spanish weekday names.
 */

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function parts(dateStr: string): [number, number, number] {
    const [y, m, d] = dateStr.split("-").map(Number);
    return [y, m, d];
}

/** Weekday name of a YYYY-MM-DD date (calendar arithmetic, no timezone). */
export function dayNameForDate(dateStr: string): string {
    const [y, m, d] = parts(dateStr);
    return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** True when `dateStr` is strictly before `todayStr` (ISO dates compare as text). */
export function isPastDate(dateStr: string, todayStr: string): boolean {
    return dateStr < todayStr;
}

/** Local calendar date of a Date as YYYY-MM-DD. */
export function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
