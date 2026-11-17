"use client";

/**
 * PlayerSheet: the card of one person, in a bottom sheet. Level with progress
 * to the next one, streaks, best lifts, status and achievements. It only
 * describes what happened: no weight is ever suggested. Presentational.
 */

import { getCatalogExercise } from "@/core/catalog";
import type { LeaderboardEntry } from "@/core/leaderboard";
import { TRACKED_LIFTS, levelProgress, type BestLift } from "@/core/stats";
import Avatar from "@/presentation/components/ui/Avatar";
import BottomSheet from "@/presentation/components/ui/BottomSheet";
import AchievementsGrid from "./AchievementsGrid";
import LevelBadge from "./LevelBadge";
import StatusIcon from "./StatusIcon";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-2">
            <h3 className="title-4 text-text-secondary">{title}</h3>
            {children}
        </section>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 rounded-xl border border-surface-border bg-surface-overlay p-3">
            <span className="caption-4 text-text-muted">{label}</span>
            <span className="title-2 text-text-primary tabular-nums">{value}</span>
        </div>
    );
}

const days = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
const kg = (n: number) => `${n.toLocaleString("es-AR")} kg`;

function liftText(lift: BestLift | null): string {
    return lift ? `${kg(lift.weight)} × ${lift.reps}` : "Sin registro";
}

export default function PlayerSheet({
    entry,
    onClose,
}: {
    entry: LeaderboardEntry;
    onClose: () => void;
}) {
    const { profile, stats } = entry;
    const progress = levelProgress(stats.xp);
    const percent = Math.min(100, Math.round((progress.xpIntoLevel / progress.xpForNextLevel) * 100));

    return (
        <BottomSheet title={profile.displayName} onClose={onClose}>
            <div className="flex flex-col gap-6 pb-2">
                <div className="flex items-center gap-4">
                    <Avatar name={profile.displayName} color={profile.avatarColor} size="md" />
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <LevelBadge level={progress.level} />
                            <StatusIcon status={stats.status} withLabel />
                        </div>
                        <p className="caption-5 text-text-muted">
                            {stats.workoutsCount} {stats.workoutsCount === 1 ? "entrenamiento" : "entrenamientos"}
                        </p>
                    </div>
                </div>

                <Section title="Nivel">
                    <div
                        role="progressbar"
                        aria-label="Progreso al próximo nivel"
                        aria-valuemin={0}
                        aria-valuemax={progress.xpForNextLevel}
                        aria-valuenow={progress.xpIntoLevel}
                        className="h-2 w-full overflow-hidden rounded-full bg-surface-strong"
                    >
                        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="caption-5 text-text-secondary">
                        {progress.xpIntoLevel} de {progress.xpForNextLevel} XP para el nivel {progress.level + 1}
                    </p>
                </Section>

                <Section title="Racha">
                    <div className="grid grid-cols-2 gap-2">
                        <Stat label="Actual" value={days(stats.streak)} />
                        <Stat label="Mejor" value={days(stats.bestStreak)} />
                    </div>
                </Section>

                <Section title="Mejores marcas">
                    <ul className="flex flex-col gap-2">
                        {TRACKED_LIFTS.map((id) => (
                            <li
                                key={id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-overlay px-3 py-2"
                            >
                                <span className="body-5 text-text-primary">
                                    {getCatalogExercise(id)?.nameEs ?? id}
                                </span>
                                <span className="body-4 text-text-secondary tabular-nums">
                                    {liftText(stats.bestLifts[id])}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Section>

                <Section title="Logros">
                    <AchievementsGrid achievements={stats.achievements} />
                </Section>
            </div>
        </BottomSheet>
    );
}
