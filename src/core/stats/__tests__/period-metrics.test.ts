import { exercise, log } from "../__fixtures__/builders";
import { computeMonthlyProgress, computeWeeklyVolume } from "../period-metrics";

// 2026-11-17 is a Tuesday: its week is 2026-11-16 to 2026-11-22.
const TODAY = "2026-11-17";

describe("computeWeeklyVolume", () => {
    it("is 0 with no logs", () => {
        expect(computeWeeklyVolume([], TODAY)).toBe(0);
    });

    it("sums reps x weight of every logged set in the current week", () => {
        const logs = [
            log("2026-11-16", [exercise([[10, 50], [8, 55]]), exercise([[12, 20]], { id: "x" })]),
            log("2026-11-17", [exercise([[5, 100]])]),
        ];
        // 500 + 440 + 240 + 500
        expect(computeWeeklyVolume(logs, TODAY)).toBe(1680);
    });

    it("starts the week on Monday and excludes the previous Sunday", () => {
        const logs = [
            log("2026-11-15", [exercise([[10, 100]])]),
            log("2026-11-16", [exercise([[10, 10]])]),
        ];
        expect(computeWeeklyVolume(logs, TODAY)).toBe(100);
    });

    it("includes Sunday as the last day of the week", () => {
        const logs = [log("2026-11-22", [exercise([[10, 10]])])];
        expect(computeWeeklyVolume(logs, "2026-11-22")).toBe(100);
        expect(computeWeeklyVolume(logs, "2026-11-23")).toBe(0);
    });

    it("counts bodyweight sets as zero volume and handles several logs a day", () => {
        const logs = [
            log("2026-11-16", [exercise([[15, 0]])]),
            log("2026-11-16", [exercise([[10, 20]])]),
        ];
        expect(computeWeeklyVolume(logs, TODAY)).toBe(200);
    });
});

describe("computeMonthlyProgress", () => {
    it("reports nothing without comparable exercises", () => {
        expect(computeMonthlyProgress([], TODAY)).toEqual({ pct: 0, improved: false });
    });

    it("needs the exercise in this month and before it", () => {
        const onlyThisMonth = [log("2026-11-03", [exercise([[8, 60]])])];
        const onlyBefore = [log("2026-10-20", [exercise([[8, 60]])])];
        expect(computeMonthlyProgress(onlyThisMonth, TODAY)).toEqual({ pct: 0, improved: false });
        expect(computeMonthlyProgress(onlyBefore, TODAY)).toEqual({ pct: 0, improved: false });
    });

    it("compares the best weight of this month with the best before it", () => {
        const logs = [
            log("2026-10-10", [exercise([[8, 50]])]),
            log("2026-10-25", [exercise([[8, 60]])]),
            log("2026-11-03", [exercise([[8, 66]])]),
        ];
        expect(computeMonthlyProgress(logs, TODAY)).toEqual({ pct: 10, improved: true });
    });

    it("averages the exercises and rounds to one decimal", () => {
        const logs = [
            log("2026-10-10", [
                exercise([[8, 60]], { id: "bench-press" }),
                exercise([[8, 100]], { id: "back-squat" }),
            ]),
            log("2026-11-05", [
                exercise([[8, 62]], { id: "bench-press" }), // +3.333...%
                exercise([[8, 110]], { id: "back-squat" }), // +10%
            ]),
        ];
        // (3.3333 + 10) / 2 = 6.6667
        expect(computeMonthlyProgress(logs, TODAY)).toEqual({ pct: 6.7, improved: true });
    });

    it("lets a decrease pull the average down and reports no improvement", () => {
        const logs = [
            log("2026-10-10", [exercise([[8, 100]])]),
            log("2026-11-05", [exercise([[8, 90]])]),
        ];
        expect(computeMonthlyProgress(logs, TODAY)).toEqual({ pct: -10, improved: false });
    });

    it("improved when any exercise rose even if the average did not", () => {
        const logs = [
            log("2026-10-10", [
                exercise([[8, 100]], { id: "back-squat" }),
                exercise([[8, 60]], { id: "bench-press" }),
            ]),
            log("2026-11-05", [
                exercise([[8, 50]], { id: "back-squat" }),
                exercise([[8, 61]], { id: "bench-press" }),
            ]),
        ];
        expect(computeMonthlyProgress(logs, TODAY).improved).toBe(true);
    });

    it("is 0 and not improved when the weight did not change", () => {
        const logs = [
            log("2026-10-10", [exercise([[8, 60]])]),
            log("2026-11-05", [exercise([[8, 60]])]),
        ];
        expect(computeMonthlyProgress(logs, TODAY)).toEqual({ pct: 0, improved: false });
    });

    it("ignores bodyweight sets with no weight", () => {
        const logs = [
            log("2026-10-10", [exercise([[10, 0]], { id: "pull-up" })]),
            log("2026-11-05", [exercise([[15, 0]], { id: "pull-up" })]),
        ];
        expect(computeMonthlyProgress(logs, TODAY)).toEqual({ pct: 0, improved: false });
    });

    it("treats the month as a calendar month, not the last 30 days", () => {
        const logs = [
            log("2026-10-31", [exercise([[8, 60]])]),
            log("2026-11-01", [exercise([[8, 63]])]),
        ];
        expect(computeMonthlyProgress(logs, TODAY)).toEqual({ pct: 5, improved: true });
    });

    it("uses the best set of the month even when it comes from a later log of the same day", () => {
        const logs = [
            log("2026-10-10", [exercise([[8, 80]])]),
            log("2026-11-05", [exercise([[8, 70]])]),
            log("2026-11-05", [exercise([[8, 88]])]),
        ];
        expect(computeMonthlyProgress(logs, TODAY)).toEqual({ pct: 10, improved: true });
    });
});
