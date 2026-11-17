/**
 * Leaderboard rules. Pure: joining the two server tables, reading a snapshot
 * against today's date and ranking it for a tab.
 */

import type { IProfile } from "../domain";
import { monthStart, weekStart, type PublicStats } from "../stats";

export type LeaderboardTab = "streak" | "weekly-volume" | "monthly-progress";

/** One person on the board: their public identity and their last snapshot. */
export interface LeaderboardEntry {
    profile: IProfile;
    stats: PublicStats;
}

export interface RankedEntry {
    /** 1 based. Ties share the position and the next one is skipped (1, 2, 2, 4). */
    position: number;
    /** The number the tab ranks by, after `normalizeStats`. */
    value: number;
    /** Carries the normalized stats. */
    entry: LeaderboardEntry;
}

/**
 * Client side join of `public_stats` and `profiles` rows. A snapshot without a
 * profile is left out (nothing to show a name for), and so is a profile that
 * never published.
 */
export function joinLeaderboard(
    profiles: readonly IProfile[],
    stats: readonly PublicStats[]
): LeaderboardEntry[] {
    const byUser = new Map(profiles.map((p) => [p.userId, p]));
    const entries: LeaderboardEntry[] = [];
    for (const snapshot of stats) {
        const profile = byUser.get(snapshot.userId);
        if (profile) entries.push({ profile, stats: snapshot });
    }
    return entries;
}

/**
 * The weekly volume and the monthly progress only hold for the week and month
 * they were published for. Once that week or month is over they read as 0.
 * A date ahead of today (another device with its clock or timezone ahead) is
 * kept: only a strictly older one is stale.
 */
export function normalizeStats(stats: PublicStats, today: string): PublicStats {
    return {
        ...stats,
        weeklyVolumeKg: stats.weekStart < weekStart(today) ? 0 : stats.weeklyVolumeKg,
        monthlyProgressPct: stats.monthStart < monthStart(today) ? 0 : stats.monthlyProgressPct,
    };
}

function valueOf(stats: PublicStats, tab: LeaderboardTab): number {
    switch (tab) {
        case "streak":
            return stats.streak;
        case "weekly-volume":
            return stats.weeklyVolumeKg;
        case "monthly-progress":
            return stats.monthlyProgressPct;
    }
}

/** Highest first. Equal values are ordered by name, then user id, so the list never jumps. */
export function rankEntries(
    entries: readonly LeaderboardEntry[],
    tab: LeaderboardTab,
    today: string
): RankedEntry[] {
    const normalized = entries.map((e) => {
        const stats = normalizeStats(e.stats, today);
        return { entry: { ...e, stats }, value: valueOf(stats, tab) };
    });
    normalized.sort(
        (a, b) =>
            b.value - a.value ||
            a.entry.profile.displayName.localeCompare(b.entry.profile.displayName, "es") ||
            a.entry.profile.userId.localeCompare(b.entry.profile.userId)
    );

    let position = 0;
    return normalized.map((item, index) => {
        if (index === 0 || item.value !== normalized[index - 1].value) position = index + 1;
        return { position, value: item.value, entry: item.entry };
    });
}
