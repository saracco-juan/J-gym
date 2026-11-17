import { computePersonalBests } from "../personal-bests";
import type { IWorkoutLog } from "../../domain";

function log(id: string, exercises: IWorkoutLog["exercises"]): IWorkoutLog {
    return { id, userId: "u1", templateId: "t", date: "2026-01-01", exercises, completedAt: null };
}

describe("computePersonalBests", () => {
    it("keeps the heaviest set per exercise key across logs", () => {
        const bests = computePersonalBests([
            log("a", [
                {
                    exercise: { id: "x", name: "Press banca" },
                    ref: { source: "catalog", id: "bench-press" },
                    sets: [
                        { setNumber: 1, actualReps: 5, actualWeight: 60 },
                        { setNumber: 2, actualReps: 5, actualWeight: 80 },
                    ],
                },
            ]),
            log("b", [
                {
                    exercise: { id: "y", name: "Press banca" },
                    ref: { source: "catalog", id: "bench-press" },
                    sets: [{ setNumber: 1, actualReps: 5, actualWeight: 70 }],
                },
            ]),
        ]);
        expect(bests.get("bench-press")).toBe(80);
    });

    it("keys legacy logs without a ref by the catalog id their name resolves to", () => {
        const bests = computePersonalBests([
            log("a", [
                {
                    exercise: { id: "x", name: "Press banca" },
                    sets: [{ setNumber: 1, actualReps: 5, actualWeight: 50 }],
                },
            ]),
        ]);
        expect(bests.get("bench-press")).toBe(50);
    });

    it("ignores exercises without weight and returns an empty map for no logs", () => {
        expect(computePersonalBests([]).size).toBe(0);
        const bests = computePersonalBests([
            log("a", [
                {
                    exercise: { id: "x", name: "Dominadas" },
                    ref: { source: "catalog", id: "pull-up" },
                    sets: [{ setNumber: 1, actualReps: 10, actualWeight: 0 }],
                },
            ]),
        ]);
        expect(bests.has("pull-up")).toBe(false);
    });
});
