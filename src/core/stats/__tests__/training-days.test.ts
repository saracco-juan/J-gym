import { seedTemplates } from "../__fixtures__/builders";
import { scheduleFor } from "../training-days";

// Training days: Monday to Thursday. 2026-11-10 is a Tuesday, 11-13 a Friday.
describe("scheduleFor", () => {
    it("reads the routine weekdays when there are no overrides", () => {
        const isScheduled = scheduleFor(seedTemplates(), {});
        expect(isScheduled("2026-11-10")).toBe(true);
        expect(isScheduled("2026-11-13")).toBe(false);
    });

    it("follows the overrides of each date", () => {
        const isScheduled = scheduleFor(seedTemplates(), {
            "2026-11-10": "viernes",
            "2026-11-13": "martes",
        });
        expect(isScheduled("2026-11-10")).toBe(false);
        expect(isScheduled("2026-11-13")).toBe(true);
        // Same weekdays of other weeks keep their routine.
        expect(isScheduled("2026-11-17")).toBe(true);
        expect(isScheduled("2026-11-20")).toBe(false);
    });

    it("schedules nothing when the routine has no training days", () => {
        expect(scheduleFor([], { "2026-11-13": "martes" })("2026-11-13")).toBe(false);
    });
});
