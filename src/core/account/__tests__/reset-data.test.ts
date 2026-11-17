import { isWorkoutInProgress, resetDataBlock } from "../reset-data";

describe("isWorkoutInProgress", () => {
    it("is true while the workout store holds a session", () => {
        expect(
            isWorkoutInProgress({ storeHasSession: true, savedSessionDate: null, today: "2026-01-05" })
        ).toBe(true);
    });

    it("is true for a saved session started today", () => {
        expect(
            isWorkoutInProgress({
                storeHasSession: false,
                savedSessionDate: "2026-01-05",
                today: "2026-01-05",
            })
        ).toBe(true);
    });

    it("ignores a stale saved session from an earlier day", () => {
        expect(
            isWorkoutInProgress({
                storeHasSession: false,
                savedSessionDate: "2026-01-04",
                today: "2026-01-05",
            })
        ).toBe(false);
    });

    it("is false with no session anywhere", () => {
        expect(
            isWorkoutInProgress({ storeHasSession: false, savedSessionDate: null, today: "2026-01-05" })
        ).toBe(false);
    });
});

describe("resetDataBlock", () => {
    it("blocks the reset while a workout is in progress", () => {
        expect(resetDataBlock({ workoutInProgress: true })).toBe("workout-in-progress");
    });

    it("allows the reset otherwise", () => {
        expect(resetDataBlock({ workoutInProgress: false })).toBeNull();
    });
});
