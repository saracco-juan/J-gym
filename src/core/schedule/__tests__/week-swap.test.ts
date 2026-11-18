import {
    applySwap,
    currentWeekDates,
    effectiveDayName,
    resetBlock,
    swapBlock,
    type SwapInput,
} from "../week-swap";

// Week of Monday 2026-11-16 .. Sunday 2026-11-22.
const WEEK = [
    "2026-11-16",
    "2026-11-17",
    "2026-11-18",
    "2026-11-19",
    "2026-11-20",
    "2026-11-21",
    "2026-11-22",
];

describe("currentWeekDates", () => {
    it("returns Monday to Sunday for a midweek day", () => {
        expect(currentWeekDates("2026-11-18")).toEqual(WEEK);
    });

    it("treats Monday and Sunday as part of the same week", () => {
        expect(currentWeekDates("2026-11-16")).toEqual(WEEK);
        expect(currentWeekDates("2026-11-22")).toEqual(WEEK);
    });

    it("crosses month and year boundaries", () => {
        expect(currentWeekDates("2027-01-01")).toEqual([
            "2026-12-28",
            "2026-12-29",
            "2026-12-30",
            "2026-12-31",
            "2027-01-01",
            "2027-01-02",
            "2027-01-03",
        ]);
    });
});

describe("effectiveDayName", () => {
    it("uses the natural weekday when there is no override", () => {
        expect(effectiveDayName("2026-11-16", {})).toBe("lunes");
    });

    it("uses the override when one exists for the date", () => {
        expect(effectiveDayName("2026-11-16", { "2026-11-16": "martes" })).toBe("martes");
    });
});

describe("applySwap", () => {
    it("swaps the weekdays of two dates", () => {
        expect(applySwap({}, "2026-11-16", "2026-11-17")).toEqual({
            "2026-11-16": "martes",
            "2026-11-17": "lunes",
        });
    });

    it("swapping back leaves no overrides", () => {
        const swapped = applySwap({}, "2026-11-16", "2026-11-17");
        expect(applySwap(swapped, "2026-11-16", "2026-11-17")).toEqual({});
    });

    it("swaps the effective weekdays, chaining earlier swaps", () => {
        const first = applySwap({}, "2026-11-16", "2026-11-17");
        expect(applySwap(first, "2026-11-17", "2026-11-18")).toEqual({
            "2026-11-16": "martes",
            "2026-11-17": "miércoles",
            "2026-11-18": "lunes",
        });
    });

    it("does not mutate the input", () => {
        const input = { "2026-11-16": "martes", "2026-11-17": "lunes" };
        applySwap(input, "2026-11-16", "2026-11-17");
        expect(input).toEqual({ "2026-11-16": "martes", "2026-11-17": "lunes" });
    });
});

describe("swapBlock", () => {
    const base: SwapInput = {
        a: "2026-11-17",
        b: "2026-11-18",
        today: "2026-11-17",
        overrides: {},
        loggedDates: new Set(),
        trainingWeekdays: new Set(["lunes", "martes", "miércoles", "viernes"]),
        sessionDate: null,
    };

    it("allows two future training days of this week", () => {
        expect(swapBlock(base)).toBeNull();
    });

    it("blocks the same day", () => {
        expect(swapBlock({ ...base, b: base.a })).toBe("same-day");
    });

    it("blocks a day of another week", () => {
        expect(swapBlock({ ...base, b: "2026-11-23" })).toBe("other-week");
        expect(swapBlock({ ...base, a: "2026-11-15" })).toBe("other-week");
    });

    it("blocks a past day", () => {
        expect(swapBlock({ ...base, a: "2026-11-16" })).toBe("past");
    });

    it("blocks a logged day", () => {
        expect(swapBlock({ ...base, loggedDates: new Set(["2026-11-17"]) })).toBe("logged");
    });

    it("allows swapping a training day with a rest day", () => {
        expect(swapBlock({ ...base, b: "2026-11-19" })).toBeNull();
        expect(swapBlock({ ...base, a: "2026-11-21", b: "2026-11-17" })).toBeNull();
    });

    it("blocks two rest days", () => {
        expect(swapBlock({ ...base, a: "2026-11-19", b: "2026-11-21" })).toBe("rest-day");
    });

    it("reads rest days through existing overrides", () => {
        const overrides = { "2026-11-18": "jueves", "2026-11-19": "miércoles" };
        const restPair = { ...base, a: "2026-11-18", b: "2026-11-21", overrides };
        expect(swapBlock(restPair)).toBe("rest-day");
        expect(swapBlock({ ...restPair, a: "2026-11-19" })).toBeNull();
    });

    it("blocks a swap with today while a session dated today is active", () => {
        expect(swapBlock({ ...base, sessionDate: "2026-11-17" })).toBe("session-in-progress");
    });

    it("allows a swap away from today during an active session", () => {
        expect(
            swapBlock({ ...base, a: "2026-11-18", b: "2026-11-20", sessionDate: "2026-11-17" })
        ).toBeNull();
    });

    it("ignores a stale session from another date", () => {
        expect(swapBlock({ ...base, sessionDate: "2026-11-16" })).toBeNull();
    });
});

describe("resetBlock", () => {
    const swapped = { "2026-11-17": "miércoles", "2026-11-18": "martes" };
    const base = {
        today: "2026-11-17",
        overrides: swapped,
        loggedDates: new Set<string>(),
        sessionDate: null,
    };

    it("allows resetting future, unlogged swaps", () => {
        expect(resetBlock(base)).toBeNull();
    });

    it("blocks when a swapped day is already past", () => {
        expect(resetBlock({ ...base, today: "2026-11-18" })).toBe("past");
    });

    it("blocks when a swapped day is logged", () => {
        expect(resetBlock({ ...base, loggedDates: new Set(["2026-11-18"]) })).toBe("logged");
    });

    it("blocks when today is swapped and a session dated today is active", () => {
        expect(resetBlock({ ...base, sessionDate: "2026-11-17" })).toBe("session-in-progress");
    });

    it("ignores overrides of other weeks", () => {
        expect(resetBlock({ ...base, overrides: { "2026-11-10": "martes" } })).toBeNull();
    });
});
