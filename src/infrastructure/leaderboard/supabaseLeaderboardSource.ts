/**
 * Supabase implementation of the leaderboard source: two plain selects, one
 * per table. Row Level Security lets registered users read every row of both.
 * Joining is the caller's job (see `loadLeaderboard`).
 *
 * The project default row limit (1000) is far above a friends group.
 */

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { LeaderboardSource } from "./loadLeaderboard";

type SelectResult = { data: unknown[] | null; error: PostgrestError | null; status: number };

async function selectAll(client: SupabaseClient, table: string): Promise<unknown[]> {
    const result: SelectResult = await client.from(table).select("*");
    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
}

export function createSupabaseLeaderboardSource(client: SupabaseClient): LeaderboardSource {
    return {
        fetchStatsRows: () => selectAll(client, "public_stats"),
        fetchProfileRows: () => selectAll(client, "profiles"),
    };
}
