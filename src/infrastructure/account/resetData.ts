/**
 * Reset of the user's data while the account stays: routine, workouts, custom
 * exercises and the unfinished session go, locally and (through the outbox)
 * on the server. Profile and account are untouched. Works offline.
 */

import { isWorkoutInProgress } from "@/core/account";
import type { LocalRepositories } from "@/infrastructure/local/localRepositories";
import { resetUserData } from "@/infrastructure/local/queries";
import { publishOwnStats } from "@/infrastructure/stats/publishStats";

export interface ResetInput {
    userId: string;
    /** Local calendar date, YYYY-MM-DD. */
    today: string;
    /** False for anonymous accounts (they publish no stats). */
    registered: boolean;
}

/** True when a workout is running now, in memory or saved on the device from today. */
export async function loadWorkoutInProgress(
    repos: LocalRepositories,
    input: { userId: string; today: string; storeHasSession: boolean }
): Promise<boolean> {
    const saved = await repos.activeSession.get(input.userId).catch(() => undefined);
    return isWorkoutInProgress({
        storeHasSession: input.storeHasSession,
        savedSessionDate: saved?.meta?.date ?? null,
        today: input.today,
    });
}

/**
 * Wipes the user's data and queues a fresh (empty) stats snapshot so the
 * leaderboard stops showing the old numbers. The snapshot is derived data:
 * if it cannot be queued, the reset itself still stands.
 */
export async function resetOwnData(repos: LocalRepositories, input: ResetInput): Promise<void> {
    await resetUserData(repos, input.userId);
    try {
        await publishOwnStats(repos, input);
    } catch {
        // The next stats trigger recomputes it.
    }
}
