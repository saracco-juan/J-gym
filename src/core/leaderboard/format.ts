/**
 * Spanish copy and number formats of the leaderboard. Pure. Numbers use a dot
 * as thousands separator and a comma as decimal separator (es-AR), written by
 * hand so the result never depends on the ICU data of the runtime.
 */

import type { LeaderboardTab } from "./ranking";

export const LEADERBOARD_TABS: ReadonlyArray<{ id: LeaderboardTab; label: string }> = [
    { id: "streak", label: "Racha" },
    { id: "weekly-volume", label: "Volumen semanal" },
    { id: "monthly-progress", label: "Progreso del mes" },
];

/** U+2212, a real minus sign (the interface writes no hyphens in text). */
const MINUS = "−";

function groupThousands(integer: string): string {
    return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatVolume(kg: number): string {
    return `${groupThousands(String(Math.round(kg)))} kg`;
}

function formatProgress(pct: number): string {
    if (pct === 0) return "0 %";
    const [integer, decimal] = Math.abs(pct).toString().split(".");
    const body = decimal ? `${integer},${decimal}` : integer;
    return `${pct > 0 ? "+" : MINUS}${body} %`;
}

/** The value a row shows next to the name, for the tab it is ranked on. */
export function formatTabValue(tab: LeaderboardTab, value: number): string {
    switch (tab) {
        case "streak":
            return `${value} ${value === 1 ? "día" : "días"}`;
        case "weekly-volume":
            return formatVolume(value);
        case "monthly-progress":
            return formatProgress(value);
    }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "hace un momento", "hace 5 min", "hace 2 h", "hace 3 días". A future time reads as just now. */
export function formatRelativeTime(thenMs: number, nowMs: number): string {
    const elapsed = Math.max(0, nowMs - thenMs);
    if (elapsed < MINUTE) return "hace un momento";
    if (elapsed < HOUR) return `hace ${Math.floor(elapsed / MINUTE)} min`;
    if (elapsed < DAY) return `hace ${Math.floor(elapsed / HOUR)} h`;
    const days = Math.floor(elapsed / DAY);
    return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

/** "Actualizado hace 5 min": shown when the board comes from the local cache. */
export function formatUpdatedAt(thenMs: number, nowMs: number): string {
    return `Actualizado ${formatRelativeTime(thenMs, nowMs)}`;
}
