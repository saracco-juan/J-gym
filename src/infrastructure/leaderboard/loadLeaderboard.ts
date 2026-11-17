/**
 * Loads the leaderboard: every public snapshot and every profile (two
 * selects), joined on the client. Users without a profile are left out.
 *
 * The last successful result is cached locally (Dexie `meta`) so the board
 * still opens offline. What is cached is the raw join, before the week and
 * month are checked against today, so an old cache never shows stale numbers
 * as current: normalizing is the reader's job (`rankEntries`).
 */

import { joinLeaderboard, type LeaderboardEntry } from "@/core/leaderboard";
import { profileFromRow, publicStatsFromRow } from "@/core/mappers";

export const LEADERBOARD_CACHE_KEY = "leaderboardCache";

export interface LeaderboardSource {
    /** Raw `public_stats` rows. */
    fetchStatsRows(): Promise<unknown[]>;
    /** Raw `profiles` rows. */
    fetchProfileRows(): Promise<unknown[]>;
}

/** The slice of the local `meta` repository this needs. */
export interface MetaStore {
    get<T = unknown>(key: string): Promise<T | undefined>;
    set(key: string, value: unknown): Promise<void>;
}

export interface CachedLeaderboard {
    /** Epoch ms of the successful fetch. */
    fetchedAt: number;
    entries: LeaderboardEntry[];
}

export interface LeaderboardResult extends CachedLeaderboard {
    /** "cache" means the server could not be reached and this is the last known board. */
    source: "network" | "cache";
}

export interface LoadLeaderboardDeps {
    source: LeaderboardSource;
    meta: MetaStore;
    now: () => number;
    /** When it returns false the server is not asked at all. */
    isOnline?: () => boolean;
}

function isCached(value: unknown): value is CachedLeaderboard {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as CachedLeaderboard).fetchedAt === "number" &&
        Array.isArray((value as CachedLeaderboard).entries)
    );
}

async function readCache(meta: MetaStore): Promise<CachedLeaderboard | undefined> {
    const cached = await meta.get(LEADERBOARD_CACHE_KEY);
    return isCached(cached) ? cached : undefined;
}

/** Network first; on any failure (or offline) the cache; throws when there is neither. */
export async function loadLeaderboard(deps: LoadLeaderboardDeps): Promise<LeaderboardResult> {
    const { source, meta, now, isOnline } = deps;
    let failure: unknown = new Error("Sin conexión.");

    if (!isOnline || isOnline()) {
        try {
            const [statsRows, profileRows] = await Promise.all([
                source.fetchStatsRows(),
                source.fetchProfileRows(),
            ]);
            const entries = joinLeaderboard(
                profileRows.map(profileFromRow),
                statsRows.map(publicStatsFromRow)
            );
            const fresh: CachedLeaderboard = { fetchedAt: now(), entries };
            // The cache is a convenience: failing to write it must not hide the board.
            await meta.set(LEADERBOARD_CACHE_KEY, fresh).catch(() => undefined);
            return { ...fresh, source: "network" };
        } catch (error) {
            failure = error;
        }
    }

    const cached = await readCache(meta).catch(() => undefined);
    if (cached) return { ...cached, source: "cache" };
    throw failure;
}
