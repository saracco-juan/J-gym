/**
 * Computes the own stats snapshot from the local data and queues it for the
 * leaderboard. Everything is local: the sync engine sends it later, so this
 * works offline and the latest snapshot always wins (see the outbox).
 *
 * Only registered users with a profile publish: the server refuses anyone
 * else (see migration 0005).
 */

import { computeUserStats } from "@/core/stats";
import type { LocalRepositories } from "@/infrastructure/local/localRepositories";

export interface PublishInput {
    userId: string;
    /** Local calendar date, YYYY-MM-DD. */
    today: string;
    /** False for anonymous accounts. */
    registered: boolean;
    /**
     * Skip when the stored snapshot was already computed today. Used on app
     * start; every other trigger (a finished workout, routine edits, the
     * profile) publishes unconditionally.
     */
    onlyIfStale?: boolean;
}

export type PublishResult = "published" | "skipped-anonymous" | "skipped-no-profile" | "skipped-fresh";

export async function publishOwnStats(
    repos: LocalRepositories,
    { userId, today, registered, onlyIfStale = false }: PublishInput
): Promise<PublishResult> {
    if (!registered) return "skipped-anonymous";
    if (!(await repos.profiles.get(userId))) return "skipped-no-profile";

    if (onlyIfStale) {
        const stored = await repos.stats.get(userId);
        if (stored && stored.date >= today) return "skipped-fresh";
    }

    const [templates, logs] = await Promise.all([
        repos.routines.listByUser(userId),
        repos.workoutLogs.listByUser(userId),
    ]);
    await repos.stats.publish(userId, today, computeUserStats({ templates, logs, today }));
    return "published";
}
