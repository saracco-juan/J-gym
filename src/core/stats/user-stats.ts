/**
 * The stats snapshot of one user: everything the leaderboard shows, computed
 * from the routine templates, the workout logs and today's local date. Pure
 * and deterministic. The numbers only describe what happened; nothing here
 * proposes a weight (AGENTS.md rule 1).
 *
 * Simplification: the schedule is the CURRENT routine, read over the whole
 * history (see `training-days.ts`), read through the week overrides.
 */

import type { IRoutineTemplate, IWorkoutLog } from "../domain";
import type { DayOverrides } from "../schedule";
import { evaluateAchievements, type AchievementStatus } from "./achievements";
import { computeBestLifts, type BestLifts } from "./best-lifts";
import { monthStart, weekStart } from "./dates";
import { XP_PER_SET, levelProgress } from "./level";
import { computeMonthlyProgress, computeWeeklyVolume } from "./period-metrics";
import { computeStatus, type TrainingStatus } from "./status";
import { computeStreaks } from "./streak";
import { isTrainedLog, loggedSetCount } from "./training-days";

export interface UserStats {
    /** Consecutive completed scheduled training days up to today. */
    streak: number;
    bestStreak: number;
    /** Total XP: XP_PER_SET per logged set. */
    xp: number;
    level: number;
    /** XP earned since the current level started. */
    xpIntoLevel: number;
    /** Size of the current level: XP between its start and the next level. */
    xpForNextLevel: number;
    bestLifts: BestLifts;
    status: TrainingStatus;
    /** Reps x weight of the sets logged in the week that starts on `weekStart`. */
    weeklyVolumeKg: number;
    /** Monday of the week `weeklyVolumeKg` belongs to. */
    weekStart: string;
    /** Average gain over the exercises done this month and before, 1 decimal. */
    monthlyProgressPct: number;
    /** First day of the month `monthlyProgressPct` belongs to. */
    monthStart: string;
    /** Logs with at least one logged set. */
    workoutsCount: number;
    achievements: AchievementStatus[];
}

export interface UserStatsInput {
    templates: readonly IRoutineTemplate[];
    logs: readonly IWorkoutLog[];
    /** Local calendar date, YYYY-MM-DD. */
    today: string;
    /** Swapped days of the user (date -> weekday shown). Defaults to none. */
    overrides?: DayOverrides;
}

export function computeUserStats({
    templates,
    logs,
    today,
    overrides = {},
}: UserStatsInput): UserStats {
    const trained = logs.filter(isTrainedLog);
    const xp = logs.reduce((sum, l) => sum + loggedSetCount(l) * XP_PER_SET, 0);
    const { streak, bestStreak } = computeStreaks(templates, logs, today, overrides);
    const monthly = computeMonthlyProgress(logs, today);
    const { level, xpIntoLevel, xpForNextLevel } = levelProgress(xp);

    return {
        streak,
        bestStreak,
        xp,
        level,
        xpIntoLevel,
        xpForNextLevel,
        bestLifts: computeBestLifts(logs),
        status: computeStatus(logs, today, monthly.improved),
        weeklyVolumeKg: computeWeeklyVolume(logs, today),
        weekStart: weekStart(today),
        monthlyProgressPct: monthly.pct,
        monthStart: monthStart(today),
        workoutsCount: trained.length,
        achievements: evaluateAchievements(templates, logs, today, overrides),
    };
}
