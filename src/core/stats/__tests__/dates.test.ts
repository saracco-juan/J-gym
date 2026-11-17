import { addDays, daysBetween, monthStart, weekStart } from "../dates";

describe("addDays", () => {
    it("moves forward and backward across month and year boundaries", () => {
        expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
        expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
        expect(addDays("2026-03-10", 0)).toBe("2026-03-10");
    });

    it("handles leap years", () => {
        expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
        expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    });
});

describe("daysBetween", () => {
    it("counts whole calendar days, signed", () => {
        expect(daysBetween("2026-01-01", "2026-01-08")).toBe(7);
        expect(daysBetween("2026-01-08", "2026-01-01")).toBe(-7);
        expect(daysBetween("2026-05-05", "2026-05-05")).toBe(0);
    });

    it("is not affected by daylight saving shifts", () => {
        expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
        expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    });
});

describe("weekStart", () => {
    it("returns the Monday of the week", () => {
        // 2026-11-17 is a Tuesday.
        expect(weekStart("2026-11-17")).toBe("2026-11-16");
        expect(weekStart("2026-11-16")).toBe("2026-11-16");
    });

    it("treats Sunday as the last day of the week", () => {
        expect(weekStart("2026-11-22")).toBe("2026-11-16");
        expect(weekStart("2026-11-23")).toBe("2026-11-23");
    });

    it("crosses month and year boundaries", () => {
        // 2026-01-01 is a Thursday.
        expect(weekStart("2026-01-01")).toBe("2025-12-29");
    });
});

describe("monthStart", () => {
    it("returns the first day of the month", () => {
        expect(monthStart("2026-11-17")).toBe("2026-11-01");
        expect(monthStart("2026-02-01")).toBe("2026-02-01");
    });
});
