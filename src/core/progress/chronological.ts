/**
 * Log ordering shared by the progress rules. Pure.
 */

import type { IWorkoutLog } from "../domain/workout-log";

/** Orders logs oldest first by date, then by completion time, keeping input order on ties. */
export function chronological(logs: readonly IWorkoutLog[]): IWorkoutLog[] {
    return logs
        .map((log, index) => ({ log, index }))
        .sort(
            (a, b) =>
                a.log.date.localeCompare(b.log.date) ||
                (a.log.completedAt ?? "").localeCompare(b.log.completedAt ?? "") ||
                a.index - b.index
        )
        .map(({ log }) => log);
}
