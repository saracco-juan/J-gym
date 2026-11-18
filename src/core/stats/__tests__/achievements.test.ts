import { exercise, log, seedTemplates, trainedLog } from "../__fixtures__/builders";
import { ACHIEVEMENTS, type AchievementId } from "../achievement-table";
import { evaluateAchievements } from "../achievements";

// Training days: Monday to Thursday. Mondays used below:
//   2026-10-19, 10-26, 11-02, 11-09, 11-16
const week = (monday: string, days = [0, 1, 2, 3]) =>
    days.map((offset) => {
        const [y, m, d] = monday.split("-").map(Number);
        const date = new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
        return trainedLog(date);
    });

function statusOf(id: AchievementId, logs: ReturnType<typeof trainedLog>[], today: string) {
    const found = evaluateAchievements(seedTemplates(), logs, today).find((a) => a.id === id);
    if (!found) throw new Error(`missing achievement ${id}`);
    return found;
}

describe("ACHIEVEMENTS table", () => {
    it("lists the four achievements in order", () => {
        expect(ACHIEVEMENTS.map((a) => a.id)).toEqual([
            "first-full-week",
            "ten-workouts",
            "four-weeks-no-miss",
            "plateau-breaker",
        ]);
    });

    it("has a Spanish title and one line description for each, without exclamation marks", () => {
        for (const a of ACHIEVEMENTS) {
            expect(a.title.trim()).not.toBe("");
            expect(a.description.trim()).not.toBe("");
            expect(`${a.title}${a.description}`).not.toMatch(/[!¡]/);
            expect(a.description).not.toMatch(/\n/);
        }
    });
});

describe("evaluateAchievements", () => {
    it("returns every achievement locked with no logs", () => {
        const result = evaluateAchievements(seedTemplates(), [], "2026-11-17");
        expect(result.map((r) => r.id)).toEqual(ACHIEVEMENTS.map((a) => a.id));
        expect(result.every((r) => !r.unlocked && r.unlockedAt === null)).toBe(true);
    });

    describe("first-full-week", () => {
        it("unlocks on the day the last scheduled day of a week was logged", () => {
            const result = statusOf("first-full-week", week("2026-11-09"), "2026-11-17");
            expect(result).toEqual({ id: "first-full-week", unlocked: true, unlockedAt: "2026-11-12" });
        });

        it("stays locked while a scheduled day of the week is missing", () => {
            const logs = week("2026-11-09", [0, 1, 3]);
            expect(statusOf("first-full-week", logs, "2026-11-17").unlocked).toBe(false);
        });

        it("does not need the rest days", () => {
            // Friday to Sunday carry no routine, so nothing is missing.
            const result = statusOf("first-full-week", week("2026-11-09"), "2026-11-15");
            expect(result.unlocked).toBe(true);
        });

        it("ignores logs on rest days", () => {
            const logs = [...week("2026-11-09", [0, 1, 2]), trainedLog("2026-11-14")];
            expect(statusOf("first-full-week", logs, "2026-11-15").unlocked).toBe(false);
        });

        it("counts a week whose routine day moved to a rest day", () => {
            // Tuesday the 10th's routine moved to Friday the 13th.
            const overrides = { "2026-11-10": "viernes", "2026-11-13": "martes" };
            const logs = week("2026-11-09", [0, 2, 3, 4]);
            const found = evaluateAchievements(seedTemplates(), logs, "2026-11-17", overrides).find(
                (a) => a.id === "first-full-week"
            );
            expect(found).toEqual({ id: "first-full-week", unlocked: true, unlockedAt: "2026-11-13" });
            expect(statusOf("first-full-week", logs, "2026-11-17").unlocked).toBe(false);
        });

        it("keeps the earliest completed week", () => {
            const logs = [...week("2026-11-02"), ...week("2026-11-09")];
            expect(statusOf("first-full-week", logs, "2026-11-17").unlockedAt).toBe("2026-11-05");
        });

        it("unlocks inside the current week once all its scheduled days are done", () => {
            const result = statusOf("first-full-week", week("2026-11-16"), "2026-11-19");
            expect(result).toMatchObject({ unlocked: true, unlockedAt: "2026-11-19" });
        });

        it("stays locked when the routine has no training days", () => {
            const result = evaluateAchievements([], week("2026-11-09"), "2026-11-17");
            expect(result[0].unlocked).toBe(false);
        });

        it("does not count a log without sets", () => {
            const logs = [
                ...week("2026-11-09", [0, 1, 2]),
                log("2026-11-12", [exercise([], { status: "skipped" })]),
            ];
            expect(statusOf("first-full-week", logs, "2026-11-17").unlocked).toBe(false);
        });
    });

    describe("ten-workouts", () => {
        const dates = [
            "2026-11-02",
            "2026-11-03",
            "2026-11-04",
            "2026-11-05",
            "2026-11-09",
            "2026-11-10",
            "2026-11-11",
            "2026-11-12",
            "2026-11-16",
            "2026-11-17",
        ];

        it("stays locked at nine workouts", () => {
            const logs = dates.slice(0, 9).map((d) => trainedLog(d));
            expect(statusOf("ten-workouts", logs, "2026-11-17").unlocked).toBe(false);
        });

        it("unlocks on the date of the tenth workout", () => {
            const logs = dates.map((d) => trainedLog(d));
            expect(statusOf("ten-workouts", logs, "2026-11-17")).toEqual({
                id: "ten-workouts",
                unlocked: true,
                unlockedAt: "2026-11-17",
            });
        });

        it("counts logs in date order whatever the input order", () => {
            const logs = [...dates].reverse().map((d) => trainedLog(d));
            expect(statusOf("ten-workouts", logs, "2026-11-17").unlockedAt).toBe("2026-11-17");
        });

        it("does not count logs without sets", () => {
            const logs = [
                ...dates.slice(0, 9).map((d) => trainedLog(d)),
                log("2026-11-17", [exercise([], { status: "skipped" })]),
            ];
            expect(statusOf("ten-workouts", logs, "2026-11-17").unlocked).toBe(false);
        });
    });

    describe("four-weeks-no-miss", () => {
        const weeks = ["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"];

        it("unlocks when the fourth consecutive week is completed", () => {
            const logs = weeks.flatMap((w) => week(w));
            expect(statusOf("four-weeks-no-miss", logs, "2026-11-17")).toEqual({
                id: "four-weeks-no-miss",
                unlocked: true,
                unlockedAt: "2026-11-12",
            });
        });

        it("stays locked with only three weeks", () => {
            const logs = weeks.slice(0, 3).flatMap((w) => week(w));
            expect(statusOf("four-weeks-no-miss", logs, "2026-11-17").unlocked).toBe(false);
        });

        it("is broken by one missed day inside the run", () => {
            const logs = [
                ...week("2026-10-19"),
                ...week("2026-10-26", [0, 1, 2]),
                ...week("2026-11-02"),
                ...week("2026-11-09"),
            ];
            expect(statusOf("four-weeks-no-miss", logs, "2026-11-17").unlocked).toBe(false);
        });

        it("finds a later run after a broken week", () => {
            const logs = [...week("2026-10-12", [0]), ...weeks.flatMap((w) => week(w))];
            expect(statusOf("four-weeks-no-miss", logs, "2026-11-17").unlockedAt).toBe("2026-11-12");
        });

        it("does not count an unfinished current week as a miss for earlier runs", () => {
            const logs = weeks.flatMap((w) => week(w));
            // The current week has not started training yet.
            expect(statusOf("four-weeks-no-miss", logs, "2026-11-16").unlocked).toBe(true);
        });
    });

    describe("plateau-breaker", () => {
        const failedBench = (date: string, kg: number) =>
            log(date, [exercise([[5, kg]], { id: "bench-press", status: "failed" })]);
        const doneBench = (date: string, kg: number) =>
            log(date, [exercise([[8, kg]], { id: "bench-press", status: "completed" })]);

        it("unlocks when a completed session beats the weight of the stagnation", () => {
            const logs = [
                failedBench("2026-10-05", 60),
                failedBench("2026-10-12", 60),
                failedBench("2026-10-19", 60),
                doneBench("2026-10-26", 62.5),
            ];
            expect(statusOf("plateau-breaker", logs, "2026-11-17")).toEqual({
                id: "plateau-breaker",
                unlocked: true,
                unlockedAt: "2026-10-26",
            });
        });

        it("stays locked while the exercise is still stagnant", () => {
            const logs = [
                failedBench("2026-10-05", 60),
                failedBench("2026-10-12", 60),
                failedBench("2026-10-19", 60),
            ];
            expect(statusOf("plateau-breaker", logs, "2026-11-17").unlocked).toBe(false);
        });

        it("needs a strictly higher weight than the best of the stagnation", () => {
            const logs = [
                failedBench("2026-10-05", 60),
                failedBench("2026-10-12", 60),
                failedBench("2026-10-19", 62),
                doneBench("2026-10-26", 62),
            ];
            expect(statusOf("plateau-breaker", logs, "2026-11-17").unlocked).toBe(false);
            expect(
                statusOf("plateau-breaker", [...logs, doneBench("2026-11-02", 63)], "2026-11-17")
                    .unlockedAt
            ).toBe("2026-11-02");
        });

        it("ignores a completed session that is lighter", () => {
            const logs = [
                failedBench("2026-10-05", 60),
                failedBench("2026-10-12", 60),
                failedBench("2026-10-19", 60),
                doneBench("2026-10-26", 55),
            ];
            expect(statusOf("plateau-breaker", logs, "2026-11-17").unlocked).toBe(false);
        });

        it("needs three failed sessions in a row", () => {
            const logs = [
                failedBench("2026-10-05", 60),
                failedBench("2026-10-12", 60),
                doneBench("2026-10-19", 70),
            ];
            expect(statusOf("plateau-breaker", logs, "2026-11-17").unlocked).toBe(false);
        });

        it("is not fooled by a completed session in the middle of the failures", () => {
            const logs = [
                failedBench("2026-10-05", 60),
                failedBench("2026-10-12", 60),
                doneBench("2026-10-19", 60),
                failedBench("2026-10-26", 60),
                doneBench("2026-11-02", 70),
            ];
            expect(statusOf("plateau-breaker", logs, "2026-11-17").unlocked).toBe(false);
        });

        it("ignores skipped sessions between the failures", () => {
            const logs = [
                failedBench("2026-10-05", 60),
                log("2026-10-08", [exercise([], { id: "bench-press", status: "skipped" })]),
                failedBench("2026-10-12", 60),
                failedBench("2026-10-19", 60),
                doneBench("2026-10-26", 65),
            ];
            expect(statusOf("plateau-breaker", logs, "2026-11-17").unlockedAt).toBe("2026-10-26");
        });

        it("takes the earliest breakthrough across exercises", () => {
            const failedSquat = (date: string) =>
                log(date, [exercise([[5, 80]], { id: "back-squat", status: "failed" })]);
            const doneSquat = (date: string, kg: number) =>
                log(date, [exercise([[8, kg]], { id: "back-squat", status: "completed" })]);
            const logs = [
                failedBench("2026-10-05", 60),
                failedBench("2026-10-12", 60),
                failedBench("2026-10-19", 60),
                doneBench("2026-11-09", 65),
                failedSquat("2026-10-06"),
                failedSquat("2026-10-13"),
                failedSquat("2026-10-20"),
                doneSquat("2026-10-27", 85),
            ];
            expect(statusOf("plateau-breaker", logs, "2026-11-17").unlockedAt).toBe("2026-10-27");
        });

        it("cannot be earned by bodyweight exercises with no weight", () => {
            const pullUp = (date: string, status: "failed" | "completed", reps: number) =>
                log(date, [exercise([[reps, 0]], { id: "pull-up", status })]);
            const logs = [
                pullUp("2026-10-05", "failed", 5),
                pullUp("2026-10-12", "failed", 5),
                pullUp("2026-10-19", "failed", 5),
                pullUp("2026-10-26", "completed", 9),
            ];
            expect(statusOf("plateau-breaker", logs, "2026-11-17").unlocked).toBe(false);
        });
    });
});
