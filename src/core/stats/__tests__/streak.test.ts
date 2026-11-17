import { emptyLog, exercise, log, seedTemplates, trainedLog } from "../__fixtures__/builders";
import { computeStreaks } from "../streak";

// Reference calendar (Monday to Thursday are the training days):
//   2026-11-09 Mon  10 Tue  11 Wed  12 Thu  13 Fri  14 Sat  15 Sun
//   2026-11-16 Mon  17 Tue  18 Wed  19 Thu  20 Fri  21 Sat  22 Sun
const FIRST_WEEK = ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"];

describe("computeStreaks", () => {
    it("is 0 with no logs", () => {
        expect(computeStreaks(seedTemplates(), [], "2026-11-17")).toEqual({
            streak: 0,
            bestStreak: 0,
        });
    });

    it("is 0 when the routine has no training days", () => {
        expect(computeStreaks([], [trainedLog("2026-11-16")], "2026-11-17")).toEqual({
            streak: 0,
            bestStreak: 0,
        });
    });

    it("counts consecutive scheduled days, today included once it is logged", () => {
        const logs = [...FIRST_WEEK, "2026-11-16", "2026-11-17"].map((d) => trainedLog(d));
        expect(computeStreaks(seedTemplates(), logs, "2026-11-17")).toEqual({
            streak: 6,
            bestStreak: 6,
        });
    });

    it("does not break the streak while today is a training day still unlogged", () => {
        const logs = [...FIRST_WEEK, "2026-11-16"].map((d) => trainedLog(d));
        expect(computeStreaks(seedTemplates(), logs, "2026-11-17").streak).toBe(5);
    });

    it("breaks on a past scheduled day without a log", () => {
        // Thursday the 12th was missed.
        const logs = ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-16", "2026-11-17"].map((d) =>
            trainedLog(d)
        );
        expect(computeStreaks(seedTemplates(), logs, "2026-11-17")).toEqual({
            streak: 2,
            bestStreak: 3,
        });
    });

    it("is 0 when the last scheduled day before an unlogged today was missed", () => {
        const logs = FIRST_WEEK.map((d) => trainedLog(d));
        // Monday the 16th was missed and today (Tuesday) is not logged yet.
        expect(computeStreaks(seedTemplates(), logs, "2026-11-17").streak).toBe(0);
    });

    it("lets rest days pass without breaking the streak", () => {
        const logs = [...FIRST_WEEK, "2026-11-16"].map((d) => trainedLog(d));
        // Friday to Sunday are rest days between Thursday and Monday.
        expect(computeStreaks(seedTemplates(), logs, "2026-11-16").streak).toBe(5);
    });

    it("keeps the streak through a rest day today", () => {
        const logs = FIRST_WEEK.map((d) => trainedLog(d));
        expect(computeStreaks(seedTemplates(), logs, "2026-11-14").streak).toBe(4);
    });

    it("ignores logs on rest days", () => {
        const logs = [...FIRST_WEEK.map((d) => trainedLog(d)), trainedLog("2026-11-14")];
        expect(computeStreaks(seedTemplates(), logs, "2026-11-15")).toEqual({
            streak: 4,
            bestStreak: 4,
        });
    });

    it("does not let a rest day log cover for a missed training day", () => {
        // Wednesday the 11th was missed; a Saturday log cannot make it up.
        const logs = ["2026-11-09", "2026-11-10", "2026-11-12", "2026-11-14"].map((d) =>
            trainedLog(d)
        );
        expect(computeStreaks(seedTemplates(), logs, "2026-11-15")).toEqual({
            streak: 1,
            bestStreak: 2,
        });
    });

    it("does not count a log without any set as a trained day", () => {
        const logs = [
            trainedLog("2026-11-09"),
            emptyLog("2026-11-10"),
            trainedLog("2026-11-11"),
        ];
        expect(computeStreaks(seedTemplates(), logs, "2026-11-11")).toEqual({
            streak: 1,
            bestStreak: 1,
        });
    });

    it("counts several logs of the same day once", () => {
        const logs = [trainedLog("2026-11-09"), trainedLog("2026-11-09"), trainedLog("2026-11-10")];
        expect(computeStreaks(seedTemplates(), logs, "2026-11-10")).toEqual({
            streak: 2,
            bestStreak: 2,
        });
    });

    it("counts a day trained across two logs where one is empty", () => {
        const logs = [emptyLog("2026-11-09"), log("2026-11-09", [exercise([[8, 30]])])];
        expect(computeStreaks(seedTemplates(), logs, "2026-11-09").streak).toBe(1);
    });

    it("keeps the best streak when the current one is shorter", () => {
        const logs = [...FIRST_WEEK, "2026-11-16", "2026-11-17", "2026-11-19"].map((d) =>
            trainedLog(d)
        );
        // Wednesday the 18th was missed: 6 in a row, then 1.
        expect(computeStreaks(seedTemplates(), logs, "2026-11-19")).toEqual({
            streak: 1,
            bestStreak: 6,
        });
    });

    it("ignores logs dated after today", () => {
        const logs = [trainedLog("2026-11-16"), trainedLog("2026-11-17")];
        expect(computeStreaks(seedTemplates(), logs, "2026-11-16").streak).toBe(1);
    });

    it("works with a weekly routine of a single day", () => {
        const logs = ["2026-11-02", "2026-11-09", "2026-11-16"].map((d) => trainedLog(d));
        expect(computeStreaks(seedTemplates(["lunes"]), logs, "2026-11-18")).toEqual({
            streak: 3,
            bestStreak: 3,
        });
    });

    it("ignores a template without exercises", () => {
        const templates = [
            ...seedTemplates(["lunes"]),
            { ...seedTemplates(["martes"])[0], exercises: [] },
        ];
        const logs = [trainedLog("2026-11-16")];
        // Tuesday is not a training day, so not logging it breaks nothing.
        expect(computeStreaks(templates, logs, "2026-11-18").streak).toBe(1);
    });
});
