import {
    SEED_DAYS,
    exercise,
    log,
    seedTemplates,
    trainedLog,
} from "../__fixtures__/builders";
import { computeUserStats } from "../user-stats";

const TODAY = "2026-11-17"; // Tuesday

describe("computeUserStats", () => {
    it("returns a clean snapshot with no logs", () => {
        const stats = computeUserStats({ templates: seedTemplates(), logs: [], today: TODAY });
        expect(stats).toMatchObject({
            streak: 0,
            bestStreak: 0,
            xp: 0,
            level: 1,
            xpIntoLevel: 0,
            xpForNextLevel: 100,
            status: "inactive",
            weeklyVolumeKg: 0,
            weekStart: "2026-11-16",
            monthlyProgressPct: 0,
            monthStart: "2026-11-01",
            workoutsCount: 0,
            bestLifts: { "back-squat": null, "bench-press": null, "lat-pulldown": null },
        });
        expect(stats.achievements.every((a) => !a.unlocked)).toBe(true);
    });

    it("gives 10 XP per logged set across all logs", () => {
        const logs = [trainedLog("2026-11-09", 4), trainedLog("2026-11-16", 6)];
        const stats = computeUserStats({ templates: seedTemplates(), logs, today: TODAY });
        expect(stats.xp).toBe(100);
        expect(stats.level).toBe(2);
        expect(stats.xpIntoLevel).toBe(0);
        expect(stats.xpForNextLevel).toBe(200);
    });

    it("counts logs on rest days for XP, volume and workouts but not for the streak", () => {
        // Saturday the 14th is a rest day; Monday 16th is in the current week.
        const logs = [
            log("2026-11-14", [exercise([[10, 50], [10, 50]])]),
            log("2026-11-16", [exercise([[10, 20]])]),
        ];
        const stats = computeUserStats({ templates: seedTemplates(), logs, today: TODAY });
        expect(stats.xp).toBe(30);
        expect(stats.workoutsCount).toBe(2);
        expect(stats.weeklyVolumeKg).toBe(200); // only Monday is in this week
        expect(stats.streak).toBe(1);
    });

    it("counts several logs on the same day as separate workouts but one streak day", () => {
        const logs = [trainedLog("2026-11-16", 2), trainedLog("2026-11-16", 3)];
        const stats = computeUserStats({ templates: seedTemplates(), logs, today: TODAY });
        expect(stats.workoutsCount).toBe(2);
        expect(stats.xp).toBe(50);
        expect(stats.streak).toBe(1);
    });

    it("ignores a log without sets everywhere", () => {
        const logs = [log("2026-11-16", [exercise([], { status: "skipped" })])];
        const stats = computeUserStats({ templates: seedTemplates(), logs, today: TODAY });
        expect(stats.workoutsCount).toBe(0);
        expect(stats.xp).toBe(0);
        expect(stats.streak).toBe(0);
    });

    it("combines status, progress, volume and best lifts", () => {
        const logs = [
            log("2026-10-12", [exercise([[5, 60]], { id: "bench-press" })]),
            log("2026-11-16", [exercise([[5, 66]], { id: "bench-press" })]),
        ];
        const stats = computeUserStats({ templates: seedTemplates(), logs, today: TODAY });
        expect(stats.status).toBe("progressing");
        expect(stats.monthlyProgressPct).toBe(10);
        expect(stats.weeklyVolumeKg).toBe(330);
        expect(stats.bestLifts["bench-press"]).toEqual({ weight: 66, reps: 5 });
    });

    it("reads the routine as it is today (documented simplification)", () => {
        const logs = ["2026-11-09", "2026-11-10"].map((d) => trainedLog(d));
        // With only Monday scheduled, Tuesday the 10th is a rest day.
        const monday = computeUserStats({ templates: seedTemplates(["lunes"]), logs, today: "2026-11-10" });
        const full = computeUserStats({ templates: seedTemplates(SEED_DAYS), logs, today: "2026-11-10" });
        expect(monday.streak).toBe(1);
        expect(full.streak).toBe(2);
    });

    it("is a pure function of its input", () => {
        const input = {
            templates: seedTemplates(),
            logs: [trainedLog("2026-11-16")],
            today: TODAY,
        };
        expect(computeUserStats(input)).toEqual(computeUserStats(input));
    });
});
