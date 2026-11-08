import { PULL_WINDOW_DAYS, pullWindowStart } from "../adoption";

describe("pullWindowStart", () => {
    it("covers the last 120 days by default", () => {
        expect(PULL_WINDOW_DAYS).toBe(120);
        const now = Date.UTC(2026, 5, 1, 12, 0, 0);
        expect(pullWindowStart(now)).toBe("2026-02-01");
    });

    it("accepts a custom window", () => {
        const now = Date.UTC(2026, 0, 10, 23, 59, 0);
        expect(pullWindowStart(now, 10)).toBe("2025-12-31");
    });
});
