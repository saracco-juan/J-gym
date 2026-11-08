/**
 * First sync of a user on this device.
 *
 * - Empty local database: pull routines, live custom exercises and the last
 *   120 days of logs into Dexie WITHOUT outbox entries (it is server data,
 *   there is nothing to push back).
 * - Local data already exists (created offline before the first sync): the
 *   server never overwrites it; only same-day routine ids are reconciled
 *   (see reconcile.ts, the server id wins).
 *
 * `lastPulledAt:<userId>` in meta marks completion; a failed pull leaves it
 * unset so the next flush retries.
 */

import { decideInitialPull, pullWindowStart } from "@/core/sync";
import { customExerciseFromRow, logFromRow, routineFromRow } from "@/core/mappers";
import type { LocalRepositories } from "@/infrastructure/local/localRepositories";
import { reconcileRoutines } from "./reconcile";
import type { SyncTransport } from "./transport";

export const lastPulledKey = (userId: string) => `lastPulledAt:${userId}`;

export async function runInitialPull(
    repos: LocalRepositories,
    transport: SyncTransport,
    userId: string,
    nowMs: number
): Promise<void> {
    const decision = decideInitialPull({
        alreadyPulled: (await repos.meta.get(lastPulledKey(userId))) !== undefined,
        localHasData: await repos.sync.hasUserData(userId),
    });
    if (decision === "skip") return;

    if (decision === "pull-all") {
        const [routines, custom, logs] = await Promise.all([
            transport.fetchRoutines(userId),
            transport.fetchCustomExercises(userId),
            transport.fetchLogsSince(userId, pullWindowStart(nowMs)),
        ]);
        await repos.sync.applyPull({
            routines: routines.map(routineFromRow),
            customExercises: custom.map(customExerciseFromRow),
            logs: logs.map(logFromRow),
        });
    } else {
        await reconcileRoutines(repos, transport, userId);
    }
    await repos.meta.set(lastPulledKey(userId), nowMs);
}
