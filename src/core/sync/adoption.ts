import type { IRoutineTemplate } from "../domain";

export interface RoutineRekey {
    from: string;
    to: string;
}

/**
 * routine_templates has UNIQUE(user_id, day_name). A locally generated UUID
 * can collide with a server row of the same day created before offline sync
 * existed. The server id wins: the local routine is re-keyed to it, so the
 * pending upsert updates that row (local content still wins).
 */
export function planRoutineRekeys(
    local: readonly IRoutineTemplate[],
    server: readonly { id: string; dayName: string }[]
): RoutineRekey[] {
    const rekeys: RoutineRekey[] = [];
    for (const routine of local) {
        const serverRow = server.find((s) => s.dayName === routine.dayName);
        if (serverRow && serverRow.id !== routine.id) {
            rekeys.push({ from: routine.id, to: serverRow.id });
        }
    }
    return rekeys;
}

export type InitialPullDecision = "skip" | "pull-all" | "reconcile-routines";

/**
 * First sync of a user on this device. An empty local database is filled
 * from the server. If local data already exists (created offline before the
 * first sync) the server never overwrites it; only routine ids are reconciled.
 */
export function decideInitialPull(input: {
    alreadyPulled: boolean;
    localHasData: boolean;
}): InitialPullDecision {
    if (input.alreadyPulled) return "skip";
    return input.localHasData ? "reconcile-routines" : "pull-all";
}

/** Logs older than this are not pulled; enough for PRs and overload history. */
export const PULL_WINDOW_DAYS = 120;

/** First date (YYYY-MM-DD, UTC) of the log window that is pulled. */
export function pullWindowStart(nowMs: number, days: number = PULL_WINDOW_DAYS): string {
    return new Date(nowMs - days * 86_400_000).toISOString().slice(0, 10);
}
