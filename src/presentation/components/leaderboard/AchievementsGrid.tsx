/**
 * AchievementsGrid: every achievement as a tile. Locked ones are muted with a
 * lock; unlocked ones show the day they were earned. Presentational.
 */

import { Barbell, CalendarCheck, Fire, Lock, Mountains } from "@phosphor-icons/react";
import { ACHIEVEMENTS, type AchievementId, type AchievementStatus } from "@/core/stats";

const ICONS: Record<AchievementId, typeof Fire> = {
    "first-full-week": CalendarCheck,
    "ten-workouts": Barbell,
    "four-weeks-no-miss": Fire,
    "plateau-breaker": Mountains,
};

function formatDay(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
    });
}

export default function AchievementsGrid({
    achievements,
}: {
    achievements: readonly AchievementStatus[];
}) {
    const byId = new Map(achievements.map((a) => [a.id, a]));
    return (
        <ul className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map((definition) => {
                const status = byId.get(definition.id);
                const unlocked = status?.unlocked === true;
                const Icon = unlocked ? ICONS[definition.id] : Lock;
                return (
                    <li
                        key={definition.id}
                        className={`flex flex-col gap-1 rounded-xl border p-3 ${
                            unlocked
                                ? "border-accent-border bg-accent-soft"
                                : "border-surface-border bg-surface-overlay opacity-60"
                        }`}
                    >
                        <Icon
                            size={24}
                            weight="bold"
                            aria-hidden="true"
                            className={unlocked ? "text-accent-text" : "text-text-muted"}
                        />
                        <p className="body-5 text-text-primary">{definition.title}</p>
                        <p className="caption-5 text-text-secondary">{definition.description}</p>
                        <p className="caption-4 text-text-muted">
                            {unlocked
                                ? status?.unlockedAt
                                    ? `Desbloqueado el ${formatDay(status.unlockedAt)}`
                                    : "Desbloqueado"
                                : "Bloqueado"}
                        </p>
                    </li>
                );
            })}
        </ul>
    );
}
