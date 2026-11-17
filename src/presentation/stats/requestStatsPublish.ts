"use client";

/**
 * Asks for the own stats snapshot to be recomputed and queued for the
 * leaderboard. Call it after anything that changes the stats: a finished
 * workout, routine edits, a saved profile. Best effort and local: it never
 * throws and never blocks the caller, and the sync engine sends it later.
 *
 * Does nothing for anonymous accounts or users without a profile (the server
 * would refuse them), see `publishOwnStats`.
 */

import { toLocalDateStr } from "@/core/schedule";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { publishOwnStats } from "@/infrastructure/stats/publishStats";
import { useAuthStore } from "@/presentation/stores/useAuthStore";
import { useSyncStore } from "@/presentation/stores/useSyncStore";

export async function requestStatsPublish(options: { onlyIfStale?: boolean } = {}): Promise<void> {
    const userId = useSyncStore.getState().userId;
    const user = useAuthStore.getState().user;
    if (!userId || !user) return;
    try {
        await publishOwnStats(getLocalRepositories(), {
            userId,
            today: toLocalDateStr(new Date()),
            registered: !user.isAnonymous,
            onlyIfStale: options.onlyIfStale,
        });
    } catch {
        // Derived data: the next trigger recomputes it.
    }
}
