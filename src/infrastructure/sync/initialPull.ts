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
 * Both cases also fetch the own profile (see `pullOwnProfile`).
 *
 * `lastPulledAt:<userId>` in meta marks completion; a failed pull leaves it
 * unset so the next flush retries.
 */

import { classifySyncError, decideInitialPull, pullWindowStart } from "@/core/sync";
import { customExerciseFromRow, logFromRow, profileFromRow, routineFromRow } from "@/core/mappers";
import type { LocalRepositories } from "@/infrastructure/local/localRepositories";
import { reconcileRoutines } from "./reconcile";
import { SyncTransportError, type SyncTransport } from "./transport";

export const lastPulledKey = (userId: string) => `lastPulledAt:${userId}`;

/**
 * Fetches the own profile and stores it when the device has none (and none is
 * waiting to be sent). Best effort: a server that fails for another reason,
 * for example because migration 0004 is not applied yet, must not block the
 * rest of the sync. Connectivity and auth problems are rethrown so the caller
 * retries later.
 */
export async function pullOwnProfile(
    repos: LocalRepositories,
    transport: SyncTransport,
    userId: string
): Promise<void> {
    let row: unknown | null;
    try {
        row = await transport.fetchProfile(userId);
    } catch (error) {
        const kind = classifySyncError(
            error instanceof SyncTransportError
                ? { status: error.status, code: error.code, message: error.message }
                : { message: error instanceof Error ? error.message : String(error) }
        );
        if (kind === "network" || kind === "auth") throw error;
        return;
    }
    if (row) await repos.sync.storeProfileIfAbsent(profileFromRow(row));
}

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
    await pullOwnProfile(repos, transport, userId);
    await repos.meta.set(lastPulledKey(userId), nowMs);
}
