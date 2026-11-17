import { resolveDayView, type DayViewInput } from "../day-view";

const TODAY = "2026-01-05";
const PAST = "2026-01-02";
const FUTURE = "2026-01-12";

function input(overrides: Partial<DayViewInput>): DayViewInput {
    return {
        dateStr: TODAY,
        todayStr: TODAY,
        hasTemplate: true,
        hasLog: false,
        hasActiveSession: false,
        ...overrides,
    };
}

describe("resolveDayView: past days", () => {
    it("shows the log when the day was trained", () => {
        expect(resolveDayView(input({ dateStr: PAST, hasLog: true }))).toEqual({ kind: "log" });
    });

    it("is empty when nothing was logged, even if a routine exists for that weekday", () => {
        expect(resolveDayView(input({ dateStr: PAST, hasTemplate: true }))).toEqual({
            kind: "empty",
        });
    });

    it("ignores an active session on a past day", () => {
        expect(
            resolveDayView(input({ dateStr: PAST, hasActiveSession: true }))
        ).toEqual({ kind: "empty" });
    });
});

describe("resolveDayView: today", () => {
    it("offers to start the routine when it has not been trained yet", () => {
        expect(resolveDayView(input({}))).toEqual({ kind: "template", action: "start" });
    });

    it("offers to resume when a session of the routine is in progress", () => {
        expect(resolveDayView(input({ hasActiveSession: true }))).toEqual({
            kind: "template",
            action: "resume",
        });
    });

    it("locks the day by showing the log once today's workout is finished", () => {
        expect(resolveDayView(input({ hasLog: true }))).toEqual({ kind: "log" });
    });

    it("prefers the log over a stale active session", () => {
        expect(resolveDayView(input({ hasLog: true, hasActiveSession: true }))).toEqual({
            kind: "log",
        });
    });

    it("is empty on a rest day", () => {
        expect(resolveDayView(input({ hasTemplate: false }))).toEqual({ kind: "empty" });
    });

    it("still shows a log recorded on a day without a routine", () => {
        expect(resolveDayView(input({ hasTemplate: false, hasLog: true }))).toEqual({
            kind: "log",
        });
    });
});

describe("resolveDayView: future days", () => {
    it("shows the plan with a disabled future action", () => {
        expect(resolveDayView(input({ dateStr: FUTURE }))).toEqual({
            kind: "template",
            action: "future",
        });
    });

    it("is empty when there is no routine for that weekday", () => {
        expect(resolveDayView(input({ dateStr: FUTURE, hasTemplate: false }))).toEqual({
            kind: "empty",
        });
    });

    it("never offers resume on a future day", () => {
        expect(resolveDayView(input({ dateStr: FUTURE, hasActiveSession: true }))).toEqual({
            kind: "template",
            action: "future",
        });
    });
});
