/**
 * computePersonalBests: heaviest logged set per exercise across logs, keyed
 * with the same key space `detectPersonalRecords` uses (ref id, else the
 * catalog id the legacy name resolves to, else the raw name).
 */

import type { IWorkoutLog } from "../domain/workout-log";
import { exerciseKey } from "./detect-personal-records";

export function computePersonalBests(logs: readonly IWorkoutLog[]): Map<string, number> {
    const bests = new Map<string, number>();
    for (const log of logs) {
        for (const ex of log.exercises) {
            const max = Math.max(...ex.sets.map((s) => s.actualWeight), 0);
            if (max <= 0) continue;
            const key = exerciseKey(ex);
            if (max > (bests.get(key) ?? 0)) bests.set(key, max);
        }
    }
    return bests;
}
