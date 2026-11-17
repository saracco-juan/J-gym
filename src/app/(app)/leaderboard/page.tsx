/**
 * Leaderboard Page: the gym table, ranked by streak, weekly volume or the
 * progress of the month.
 *
 * Static shell: the data comes from Supabase (or the local cache when offline)
 * on the client, so one cached document serves the screen offline.
 * Authentication is handled by the proxy.
 */

import LeaderboardView from "@/presentation/components/leaderboard/LeaderboardView";

export default function LeaderboardPage() {
    return (
        <main className="min-h-dvh bg-surface-base">
            <LeaderboardView />
        </main>
    );
}
