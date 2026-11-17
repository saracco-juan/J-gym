import { ACHIEVEMENTS, TRACKED_LIFTS, TRAINING_STATUSES } from "../stats";
import type { AchievementStatus, BestLifts, PublicStats, TrainingStatus, UserStats } from "../stats";
import { asArray, asNullableString, asNumber, asRecord, asString } from "./coerce";

/** Shape of `best_lifts` and `achievements`. Bump it when they change. */
export const STATS_SCHEMA_VERSION = 1;

export interface PublicStatsRow {
    user_id: string;
    streak: number;
    best_streak: number;
    level: number;
    xp: number;
    weekly_volume_kg: number;
    week_start: string;
    monthly_progress_pct: number;
    month: string;
    status: TrainingStatus;
    best_lifts: BestLifts;
    achievements: AchievementStatus[];
    workouts_count: number;
    schema_version: number;
}

/** Outbox payload of a stats publish. `userId` lets the flush skip other users' leftovers. */
export interface StatsPayload {
    userId: string;
    stats: UserStats;
}

/** `updated_at` is maintained by the server trigger, so it is not sent. */
export function statsToRow({ userId, stats }: StatsPayload): PublicStatsRow {
    return {
        user_id: userId,
        streak: stats.streak,
        best_streak: stats.bestStreak,
        level: stats.level,
        xp: stats.xp,
        weekly_volume_kg: stats.weeklyVolumeKg,
        week_start: stats.weekStart,
        monthly_progress_pct: stats.monthlyProgressPct,
        month: stats.monthStart,
        status: stats.status,
        best_lifts: stats.bestLifts,
        achievements: stats.achievements,
        workouts_count: stats.workoutsCount,
        schema_version: STATS_SCHEMA_VERSION,
    };
}

function parseBestLifts(value: unknown): BestLifts {
    const rec = asRecord(value);
    const lifts = {} as BestLifts;
    for (const lift of TRACKED_LIFTS) {
        const entry = asRecord(rec[lift]);
        const weight = asNumber(entry.weight);
        lifts[lift] = weight > 0 ? { weight, reps: asNumber(entry.reps) } : null;
    }
    return lifts;
}

/** Always every known achievement, in table order: unknown ids are dropped, missing ones locked. */
function parseAchievements(value: unknown): AchievementStatus[] {
    const byId = new Map<string, Record<string, unknown>>();
    for (const item of asArray(value)) {
        const rec = asRecord(item);
        byId.set(asString(rec.id), rec);
    }
    return ACHIEVEMENTS.map(({ id }) => {
        const rec = byId.get(id);
        const unlocked = rec?.unlocked === true;
        return { id, unlocked, unlockedAt: unlocked ? asNullableString(rec?.unlockedAt) : null };
    });
}

/** Never throws: partial or garbage rows become a neutral snapshot. */
export function publicStatsFromRow(row: unknown): PublicStats {
    const rec = asRecord(row);
    const status = asString(rec.status);
    return {
        userId: asString(rec.user_id),
        streak: asNumber(rec.streak),
        bestStreak: asNumber(rec.best_streak),
        xp: asNumber(rec.xp),
        level: Math.max(1, asNumber(rec.level)),
        bestLifts: parseBestLifts(rec.best_lifts),
        status: (TRAINING_STATUSES as readonly string[]).includes(status)
            ? (status as TrainingStatus)
            : "steady",
        weeklyVolumeKg: asNumber(rec.weekly_volume_kg),
        weekStart: asString(rec.week_start),
        monthlyProgressPct: asNumber(rec.monthly_progress_pct),
        monthStart: asString(rec.month),
        workoutsCount: asNumber(rec.workouts_count),
        achievements: parseAchievements(rec.achievements),
        updatedAt: asNullableString(rec.updated_at),
    };
}
