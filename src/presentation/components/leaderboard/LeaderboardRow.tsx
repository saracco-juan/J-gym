/**
 * LeaderboardRow: one ranked person. The whole row is a button that opens the
 * player card. The own row is highlighted. Presentational.
 */

import { formatTabValue, type LeaderboardTab, type RankedEntry } from "@/core/leaderboard";
import Avatar from "@/presentation/components/ui/Avatar";
import LevelBadge from "./LevelBadge";
import StatusIcon from "./StatusIcon";

interface LeaderboardRowProps {
    ranked: RankedEntry;
    tab: LeaderboardTab;
    isOwn: boolean;
    onOpen: () => void;
}

export default function LeaderboardRow({ ranked, tab, isOwn, onOpen }: LeaderboardRowProps) {
    const { profile, stats } = ranked.entry;
    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                aria-current={isOwn ? "true" : undefined}
                className={`pressable flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                    isOwn
                        ? "border-accent-border bg-accent-soft"
                        : "border-surface-border bg-surface-raised hover:bg-surface-overlay"
                }`}
            >
                <span className="body-4 w-6 shrink-0 text-center text-text-secondary tabular-nums">
                    {ranked.position}
                </span>
                <span className="size-10 shrink-0">
                    <Avatar name={profile.displayName} color={profile.avatarColor} size="fill" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="body-4 truncate text-text-primary">
                        {profile.displayName}
                        {isOwn && <span className="caption-4 ml-2 text-accent-text">Vos</span>}
                    </span>
                    <span className="flex items-center gap-2">
                        <LevelBadge level={stats.level} />
                        <StatusIcon status={stats.status} size={16} />
                    </span>
                </span>
                <span className="body-4 shrink-0 text-text-primary tabular-nums">
                    {formatTabValue(tab, ranked.value)}
                </span>
            </button>
        </li>
    );
}
