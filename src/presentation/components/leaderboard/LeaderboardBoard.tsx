"use client";

/**
 * LeaderboardBoard: the table for a user who can appear on it. Loads the
 * board (network, else the local cache), lets the user switch the ranking
 * tab and opens a person's card.
 */

import { useMemo, useState } from "react";
import { WifiSlash } from "@phosphor-icons/react";
import { formatUpdatedAt, rankEntries, type LeaderboardTab } from "@/core/leaderboard";
import LeaderboardRow from "./LeaderboardRow";
import { LeaderboardEmpty, LeaderboardError } from "./LeaderboardMessages";
import LeaderboardSkeleton from "./LeaderboardSkeleton";
import LeaderboardTabs, { TAB_PANEL_ID, tabId } from "./LeaderboardTabs";
import PlayerSheet from "./PlayerSheet";
import { useLeaderboard } from "./useLeaderboard";

export default function LeaderboardBoard({ userId }: { userId: string }) {
    const { state, reload } = useLeaderboard();
    const [tab, setTab] = useState<LeaderboardTab>("streak");
    const [openUserId, setOpenUserId] = useState<string | null>(null);

    const ranked = useMemo(
        () => (state.status === "ready" ? rankEntries(state.result.entries, tab, state.today) : []),
        [state, tab]
    );

    if (state.status === "loading") return <LeaderboardSkeleton />;
    if (state.status === "error") return <LeaderboardError onRetry={() => void reload()} />;

    const opened = ranked.find((r) => r.entry.profile.userId === openUserId);

    return (
        <div className="flex flex-col gap-4">
            {state.result.source === "cache" && (
                <p
                    role="status"
                    className="caption-4 flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-text-secondary"
                >
                    <WifiSlash size={16} weight="bold" aria-hidden="true" />
                    Sin conexión. {formatUpdatedAt(state.result.fetchedAt, state.loadedAt)}
                </p>
            )}

            {ranked.length === 0 ? (
                <LeaderboardEmpty />
            ) : (
                <>
                    <LeaderboardTabs selected={tab} onSelect={setTab} />
                    <div role="tabpanel" id={TAB_PANEL_ID} aria-labelledby={tabId(tab)}>
                        <ol className="flex flex-col gap-2">
                            {ranked.map((r) => (
                                <LeaderboardRow
                                    key={r.entry.profile.userId}
                                    ranked={r}
                                    tab={tab}
                                    isOwn={r.entry.profile.userId === userId}
                                    onOpen={() => setOpenUserId(r.entry.profile.userId)}
                                />
                            ))}
                        </ol>
                    </div>
                </>
            )}

            {opened && <PlayerSheet entry={opened.entry} onClose={() => setOpenUserId(null)} />}
        </div>
    );
}
