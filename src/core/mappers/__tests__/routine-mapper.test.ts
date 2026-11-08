import type { IRoutineTemplate } from "../../domain";
import { routineFromRow, routineToRow } from "../routine-mapper";

describe("routineFromRow", () => {
    it("maps a legacy row (no ref, no schema_version) and resolves the catalog ref by name", () => {
        const routine = routineFromRow({
            id: "r1",
            user_id: "u1",
            day_name: "lunes",
            exercises: [
                {
                    exercise_id: "legacy-uuid",
                    exercise_name: "Press banca",
                    sets: [{ set_number: 1, target_reps: 10, target_weight: 60 }],
                },
            ],
        });
        expect(routine.id).toBe("r1");
        expect(routine.userId).toBe("u1");
        expect(routine.dayName).toBe("lunes");
        expect(routine.exercises).toHaveLength(1);
        const ex = routine.exercises[0];
        expect(ex.exercise).toEqual({ id: "legacy-uuid", name: "Press banca" });
        expect(ex.ref?.source).toBe("catalog");
        expect(ex.sets).toEqual([{ setNumber: 1, targetReps: 10, targetWeight: 60 }]);
    });

    it("leaves ref undefined when the legacy name is unknown", () => {
        const routine = routineFromRow({
            id: "r1",
            user_id: "u1",
            day_name: "lunes",
            exercises: [{ exercise_id: "x", exercise_name: "Zzz inventado", sets: [] }],
        });
        expect(routine.exercises[0].ref).toBeUndefined();
    });

    it("keeps an explicit valid ref over name resolution", () => {
        const routine = routineFromRow({
            id: "r1",
            user_id: "u1",
            day_name: "lunes",
            exercises: [
                {
                    exercise_id: "c1",
                    exercise_name: "Press banca",
                    ref: { source: "custom", id: "c1" },
                    sets: [],
                },
            ],
        });
        expect(routine.exercises[0].ref).toEqual({ source: "custom", id: "c1" });
    });

    it("tolerates garbage: strings as numbers, missing sets, null exercises, invalid ref", () => {
        const routine = routineFromRow({
            id: "r1",
            user_id: "u1",
            day_name: "lunes",
            exercises: [
                {
                    exercise_id: "a",
                    exercise_name: "Algo",
                    ref: { source: "weird", id: 5 },
                    sets: [
                        { set_number: "2", target_reps: "8", target_weight: "42.5" },
                        null,
                        { set_number: "x" },
                    ],
                },
                { exercise_id: "b", exercise_name: "Otro" },
                null,
                "junk",
            ],
        });
        const [a, b] = routine.exercises;
        expect(a.ref).toBeUndefined();
        expect(a.sets[0]).toEqual({ setNumber: 2, targetReps: 8, targetWeight: 42.5 });
        expect(a.sets).toHaveLength(3);
        expect(a.sets[2]).toEqual({ setNumber: 0, targetReps: 0, targetWeight: 0 });
        expect(b.sets).toEqual([]);
    });

    it("does not throw on null, non-object or empty rows", () => {
        expect(() => routineFromRow(null)).not.toThrow();
        expect(() => routineFromRow("nope")).not.toThrow();
        expect(routineFromRow({}).exercises).toEqual([]);
        expect(routineFromRow({ exercises: "bad" }).exercises).toEqual([]);
    });
});

describe("routineToRow", () => {
    const routine: IRoutineTemplate = {
        id: "r1",
        userId: "u1",
        dayName: "lunes",
        exercises: [
            {
                exercise: { id: "bench-press", name: "Press banca" },
                ref: { source: "catalog", id: "bench-press" },
                sets: [{ setNumber: 1, targetReps: 10, targetWeight: 60 }],
            },
            {
                exercise: { id: "old", name: "Libre" },
                sets: [],
            },
        ],
    };

    it("writes snake_case with schema_version 2 and optional ref", () => {
        const row = routineToRow(routine);
        expect(row).toEqual({
            id: "r1",
            user_id: "u1",
            day_name: "lunes",
            schema_version: 2,
            exercises: [
                {
                    exercise_id: "bench-press",
                    exercise_name: "Press banca",
                    ref: { source: "catalog", id: "bench-press" },
                    sets: [{ set_number: 1, target_reps: 10, target_weight: 60 }],
                },
                { exercise_id: "old", exercise_name: "Libre", sets: [] },
            ],
        });
    });

    it("round-trips through routineFromRow", () => {
        expect(routineFromRow(routineToRow(routine))).toEqual(routine);
    });
});
