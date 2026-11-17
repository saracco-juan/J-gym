import {
    LEADERBOARD_TABS,
    formatRelativeTime,
    formatTabValue,
    formatUpdatedAt,
} from "../format";

describe("LEADERBOARD_TABS", () => {
    it("lists the three tabs with their Spanish labels", () => {
        expect(LEADERBOARD_TABS).toEqual([
            { id: "streak", label: "Racha" },
            { id: "weekly-volume", label: "Volumen semanal" },
            { id: "monthly-progress", label: "Progreso del mes" },
        ]);
    });
});

describe("formatTabValue", () => {
    it("writes the streak in days", () => {
        expect(formatTabValue("streak", 0)).toBe("0 días");
        expect(formatTabValue("streak", 1)).toBe("1 día");
        expect(formatTabValue("streak", 12)).toBe("12 días");
    });

    it("writes the weekly volume in kg with a dot as thousands separator", () => {
        expect(formatTabValue("weekly-volume", 0)).toBe("0 kg");
        expect(formatTabValue("weekly-volume", 950)).toBe("950 kg");
        expect(formatTabValue("weekly-volume", 12500)).toBe("12.500 kg");
        expect(formatTabValue("weekly-volume", 1234567)).toBe("1.234.567 kg");
    });

    it("rounds the volume to whole kg", () => {
        expect(formatTabValue("weekly-volume", 1250.6)).toBe("1.251 kg");
    });

    it("writes the monthly progress as a signed percentage with a decimal comma", () => {
        expect(formatTabValue("monthly-progress", 3.5)).toBe("+3,5 %");
        expect(formatTabValue("monthly-progress", 10)).toBe("+10 %");
        expect(formatTabValue("monthly-progress", 0)).toBe("0 %");
        expect(formatTabValue("monthly-progress", -2.5)).toBe("−2,5 %");
    });
});

describe("formatRelativeTime", () => {
    const now = Date.UTC(2026, 10, 17, 12, 0, 0);
    const ago = (ms: number) => formatRelativeTime(now - ms, now);

    it("says a moment for under a minute", () => {
        expect(ago(0)).toBe("hace un momento");
        expect(ago(59_000)).toBe("hace un momento");
    });

    it("counts minutes, hours and days", () => {
        expect(ago(60_000)).toBe("hace 1 min");
        expect(ago(5 * 60_000)).toBe("hace 5 min");
        expect(ago(59 * 60_000)).toBe("hace 59 min");
        expect(ago(60 * 60_000)).toBe("hace 1 h");
        expect(ago(23 * 3_600_000)).toBe("hace 23 h");
        expect(ago(24 * 3_600_000)).toBe("hace 1 día");
        expect(ago(3 * 24 * 3_600_000)).toBe("hace 3 días");
    });

    it("treats a time in the future as just now", () => {
        expect(formatRelativeTime(now + 5000, now)).toBe("hace un momento");
    });
});

describe("formatUpdatedAt", () => {
    it("prefixes the relative time", () => {
        const now = Date.UTC(2026, 10, 17, 12, 0, 0);
        expect(formatUpdatedAt(now - 5 * 60_000, now)).toBe("Actualizado hace 5 min");
    });
});
