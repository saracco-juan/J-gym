import { detectPersonalRecords } from "../detect-personal-records";
import type { IWorkoutExercise } from "../../domain/workout-log";

function exercise(name: string, weights: number[]): IWorkoutExercise {
    return {
        exercise: { id: name, name },
        sets: weights.map((w, i) => ({
            setNumber: i + 1,
            actualReps: 10,
            actualWeight: w,
        })),
    };
}

describe("detectPersonalRecords", () => {
    it("flags an exercise whose max weight beats the previous best", () => {
        const result = detectPersonalRecords(
            [exercise("Press banca", [60, 65])],
            new Map([["Press banca", 60]])
        );
        expect(result).toEqual(["Press banca"]);
    });

    it("does not flag a weight equal to the previous best", () => {
        const result = detectPersonalRecords(
            [exercise("Press banca", [60, 60])],
            new Map([["Press banca", 60]])
        );
        expect(result).toEqual([]);
    });

    it("flags a first-ever exercise lifted with weight above zero", () => {
        const result = detectPersonalRecords([exercise("Remo", [30])], new Map());
        expect(result).toEqual(["Remo"]);
    });

    it("does not flag bodyweight (zero weight) first-time exercises", () => {
        const result = detectPersonalRecords([exercise("Dominadas", [0, 0])], new Map());
        expect(result).toEqual([]);
    });

    it("evaluates each exercise independently and keeps session order", () => {
        const result = detectPersonalRecords(
            [
                exercise("Press banca", [70]),
                exercise("Remo", [30]),
                exercise("Sentadilla", [100]),
            ],
            new Map([
                ["Press banca", 65],
                ["Remo", 40],
            ])
        );
        expect(result).toEqual(["Press banca", "Sentadilla"]);
    });

    it("ignores exercises without sets", () => {
        expect(detectPersonalRecords([exercise("Remo", [])], new Map())).toEqual([]);
    });
});
