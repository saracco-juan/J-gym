import { detectPersonalRecords } from "../detect-personal-records";
import type { IWorkoutExercise } from "../../domain/workout-log";
import type { ExerciseRef } from "../../catalog/types";

function exercise(name: string, weights: number[], ref?: ExerciseRef): IWorkoutExercise {
    return {
        exercise: { id: name, name },
        ref,
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

describe("detectPersonalRecords keyed by exercise id", () => {
    const BENCH: ExerciseRef = { source: "catalog", id: "bench-press" };

    it("compares against the previous best stored under the exercise id", () => {
        const previous = new Map([["bench-press", 60]]);
        expect(detectPersonalRecords([exercise("Press banca", [65], BENCH)], previous)).toEqual([
            "Press banca",
        ]);
        expect(detectPersonalRecords([exercise("Press banca", [60], BENCH)], previous)).toEqual([]);
    });

    it("ignores a renamed display name when the id matches", () => {
        const previous = new Map([["bench-press", 80]]);
        expect(
            detectPersonalRecords([exercise("Banca plana", [75], BENCH)], previous)
        ).toEqual([]);
    });

    it("keys custom exercises by their UUID", () => {
        const custom: ExerciseRef = { source: "custom", id: "6f1c0a52-1111-4a2b-9c3d-0a1b2c3d4e5f" };
        const previous = new Map([[custom.id, 20]]);
        expect(detectPersonalRecords([exercise("Mi ejercicio", [25], custom)], previous)).toEqual([
            "Mi ejercicio",
        ]);
        expect(detectPersonalRecords([exercise("Mi ejercicio", [20], custom)], previous)).toEqual([]);
    });

    it("keeps different exercises separate: a replacement has its own history", () => {
        const dbPress: ExerciseRef = { source: "catalog", id: "dumbbell-bench-press" };
        const previous = new Map([["bench-press", 100]]);
        expect(detectPersonalRecords([exercise("Press mancuernas", [30], dbPress)], previous)).toEqual([
            "Press mancuernas",
        ]);
    });

    it("flags an exercise only once when it appears twice in a session", () => {
        const result = detectPersonalRecords(
            [exercise("Press banca", [70], BENCH), exercise("Press banca", [75], BENCH)],
            new Map([["bench-press", 60]])
        );
        expect(result).toEqual(["Press banca"]);
    });
});

describe("detectPersonalRecords legacy name fallback", () => {
    it("resolves a legacy log without ref to its catalog id", () => {
        const previous = new Map([["bench-press", 60]]);
        expect(detectPersonalRecords([exercise("press BANCA", [60])], previous)).toEqual([]);
        expect(detectPersonalRecords([exercise("Press banca", [62.5])], previous)).toEqual([
            "Press banca",
        ]);
    });

    it("matches a name-keyed legacy history against a ref-based log", () => {
        const BENCH: ExerciseRef = { source: "catalog", id: "bench-press" };
        const previous = new Map([["Press banca", 70]]);
        expect(detectPersonalRecords([exercise("Press banca", [65], BENCH)], previous)).toEqual([]);
        expect(detectPersonalRecords([exercise("Press banca", [72.5], BENCH)], previous)).toEqual([
            "Press banca",
        ]);
    });

    it("takes the best of legacy-name and id entries for the same exercise", () => {
        const previous = new Map([
            ["Press banca", 70],
            ["bench-press", 80],
        ]);
        expect(detectPersonalRecords([exercise("Press banca", [75])], previous)).toEqual([]);
        expect(detectPersonalRecords([exercise("Press banca", [85])], previous)).toEqual([
            "Press banca",
        ]);
    });

    it("keeps raw-name matching for names that are not in the catalog", () => {
        const previous = new Map([["Ejercicio raro", 10]]);
        expect(detectPersonalRecords([exercise("Ejercicio raro", [12])], previous)).toEqual([
            "Ejercicio raro",
        ]);
        expect(detectPersonalRecords([exercise("Ejercicio raro", [10])], previous)).toEqual([]);
    });
});
