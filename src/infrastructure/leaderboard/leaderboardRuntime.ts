/**
 * Browser wiring of the leaderboard: the real Supabase source, the local
 * cache and the connectivity check. Client-only.
 */

import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { loadLeaderboard, type LeaderboardResult } from "./loadLeaderboard";
import { createSupabaseLeaderboardSource } from "./supabaseLeaderboardSource";

export function fetchLeaderboard(): Promise<LeaderboardResult> {
    return loadLeaderboard({
        source: createSupabaseLeaderboardSource(createSupabaseBrowserClient()),
        meta: getLocalRepositories().meta,
        now: () => Date.now(),
        isOnline: () => (typeof navigator === "undefined" ? true : navigator.onLine),
    });
}
