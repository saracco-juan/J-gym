import type { UserStats } from "../../stats";
import { STATS_SCHEMA_VERSION, publicStatsFromRow, statsToRow } from "../stats-mapper";

const stats: UserStats = {
    streak: 6,
    bestStreak: 9,
    xp: 420,
    level: 3,
    xpIntoLevel: 120,
    xpForNextLevel: 300,
    bestLifts: {
        "back-squat": { weight: 100, reps: 5 },
        "bench-press": null,
        "lat-pulldown": { weight: 55, reps: 10 },
    },
    status: "progressing",
    weeklyVolumeKg: 5400.5,
    weekStart: "2026-11-16",
    monthlyProgressPct: 4.2,
    monthStart: "2026-11-01",
    workoutsCount: 14,
    achievements: [
        { id: "first-full-week", unlocked: true, unlockedAt: "2026-11-12" },
        { id: "ten-workouts", unlocked: true, unlockedAt: "2026-11-16" },
        { id: "four-weeks-no-miss", unlocked: false, unlockedAt: null },
        { id: "plateau-breaker", unlocked: false, unlockedAt: null },
    ],
};

describe("statsToRow", () => {
    it("maps the snapshot to the public_stats columns", () => {
        expect(statsToRow({ userId: "u1", stats })).toEqual({
            user_id: "u1",
            streak: 6,
            best_streak: 9,
            level: 3,
            xp: 420,
            weekly_volume_kg: 5400.5,
            week_start: "2026-11-16",
            monthly_progress_pct: 4.2,
            month: "2026-11-01",
            status: "progressing",
            best_lifts: stats.bestLifts,
            achievements: stats.achievements,
            workouts_count: 14,
            schema_version: STATS_SCHEMA_VERSION,
        });
    });

    it("does not send the derived level progress or updated_at", () => {
        const row = statsToRow({ userId: "u1", stats });
        expect(row).not.toHaveProperty("xp_into_level");
        expect(row).not.toHaveProperty("updated_at");
    });
});

describe("publicStatsFromRow", () => {
    const row = statsToRow({ userId: "u1", stats });

    it("round trips a snapshot", () => {
        const back = publicStatsFromRow({ ...row, updated_at: "2026-11-17T10:00:00Z" });
        expect(back).toEqual({
            userId: "u1",
            streak: 6,
            bestStreak: 9,
            xp: 420,
            level: 3,
            bestLifts: stats.bestLifts,
            status: "progressing",
            weeklyVolumeKg: 5400.5,
            weekStart: "2026-11-16",
            monthlyProgressPct: 4.2,
            monthStart: "2026-11-01",
            workoutsCount: 14,
            achievements: stats.achievements,
            updatedAt: "2026-11-17T10:00:00Z",
        });
    });

    it("accepts numeric values sent as strings", () => {
        const back = publicStatsFromRow({
            ...row,
            weekly_volume_kg: "1250.5",
            monthly_progress_pct: "-2.5",
        });
        expect(back.weeklyVolumeKg).toBe(1250.5);
        expect(back.monthlyProgressPct).toBe(-2.5);
    });

    it("falls back to steady for an unknown status", () => {
        expect(publicStatsFromRow({ ...row, status: "legendary" }).status).toBe("steady");
    });

    it("keeps only the tracked lifts and ignores malformed ones", () => {
        const back = publicStatsFromRow({
            ...row,
            best_lifts: {
                "back-squat": { weight: "80", reps: 6 },
                "bench-press": { weight: "x" },
                "lat-pulldown": 12,
                "leg-press": { weight: 300, reps: 8 },
            },
        });
        expect(back.bestLifts).toEqual({
            "back-squat": { weight: 80, reps: 6 },
            "bench-press": null,
            "lat-pulldown": null,
        });
    });

    it("rebuilds every achievement in table order, locking the missing and unknown ones", () => {
        const back = publicStatsFromRow({
            ...row,
            achievements: [
                { id: "plateau-breaker", unlocked: true, unlockedAt: "2026-11-01" },
                { id: "space-walk", unlocked: true, unlockedAt: "2026-11-02" },
                { id: "ten-workouts", unlocked: true },
            ],
        });
        expect(back.achievements).toEqual([
            { id: "first-full-week", unlocked: false, unlockedAt: null },
            { id: "ten-workouts", unlocked: true, unlockedAt: null },
            { id: "four-weeks-no-miss", unlocked: false, unlockedAt: null },
            { id: "plateau-breaker", unlocked: true, unlockedAt: "2026-11-01" },
        ]);
    });

    it("never throws on garbage", () => {
        const back = publicStatsFromRow(null);
        expect(back).toMatchObject({
            userId: "",
            streak: 0,
            level: 1,
            xp: 0,
            status: "steady",
            weeklyVolumeKg: 0,
            workoutsCount: 0,
            updatedAt: null,
        });
        expect(back.achievements).toHaveLength(4);
        expect(back.bestLifts).toEqual({
            "back-squat": null,
            "bench-press": null,
            "lat-pulldown": null,
        });
        expect(() => publicStatsFromRow("x")).not.toThrow();
        expect(() => publicStatsFromRow({ best_lifts: "oops", achievements: {} })).not.toThrow();
    });
});
