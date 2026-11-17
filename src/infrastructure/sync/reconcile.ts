/**
 * Routine id reconciliation.
 *
 * routine_templates has UNIQUE(user_id, day_name) and the server may already
 * hold a row for a day under another id (data created before offline sync).
 * Choice: the SERVER id wins. The local routine is re-keyed to it (logs that
 * reference it follow) and the pending upsert then updates that row, so the
 * local content still wins and no duplicate is created.
 *
 * Returns how many routines were re-keyed.
 */

import { planRoutineRekeys } from "@/core/sync";
import { routineFromRow } from "@/core/mappers";
import type { LocalRepositories } from "@/infrastructure/local/localRepositories";
import type { SyncTransport } from "./transport";

export async function reconcileRoutines(
    repos: LocalRepositories,
    transport: SyncTransport,
    userId: string
): Promise<number> {
    const serverRows = (await transport.fetchRoutines(userId)).map(routineFromRow);
    const local = await repos.routines.listByUser(userId);
    const rekeys = planRoutineRekeys(local, serverRows);
    let done = 0;
    for (const { from, to } of rekeys) {
        if (await repos.sync.rekeyRoutine(from, to)) done++;
    }
    return done;
}
