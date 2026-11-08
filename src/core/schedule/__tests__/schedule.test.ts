import { dayNameForDate, isPastDate, toLocalDateStr } from "../schedule";

describe("dayNameForDate", () => {
    it("maps a YYYY-MM-DD date to the Spanish weekday stored in routines", () => {
        expect(dayNameForDate("2026-01-05")).toBe("lunes");
        expect(dayNameForDate("2026-01-07")).toBe("miércoles");
        expect(dayNameForDate("2026-01-10")).toBe("sábado");
        expect(dayNameForDate("2026-01-11")).toBe("domingo");
    });
});

describe("isPastDate", () => {
    it("is true only for days before today", () => {
        expect(isPastDate("2026-01-04", "2026-01-05")).toBe(true);
        expect(isPastDate("2026-01-05", "2026-01-05")).toBe(false);
        expect(isPastDate("2026-01-06", "2026-01-05")).toBe(false);
    });
});

describe("toLocalDateStr", () => {
    it("formats local calendar fields, not UTC", () => {
        expect(toLocalDateStr(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
        expect(toLocalDateStr(new Date(2026, 11, 1, 0, 1))).toBe("2026-12-01");
    });
});
