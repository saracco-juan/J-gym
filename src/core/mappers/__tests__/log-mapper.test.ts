import type { IWorkoutLog } from "../../domain";
import { logFromRow, logToRow } from "../log-mapper";

const legacyRow = {
    id: "l1",
    user_id: "u1",
    template_id: "t1",
    date: "2026-01-05",
    completed_at: "2026-01-05T10:00:00Z",
    exercises: [
        {
            exercise_id: "legacy",
            exercise_name: "Dominadas",
            sets: [{ set_number: 1, actual_reps: 10, actual_weight: 0 }],
        },
        { exercise_id: "legacy2", exercise_name: "Zzz inventado", sets: [] },
    ],
};

describe("logFromRow", () => {
    it("maps a legacy log: resolves ref and derives status from sets", () => {
        const log = logFromRow(legacyRow);
        expect(log).toMatchObject({
            id: "l1",
            userId: "u1",
            templateId: "t1",
            date: "2026-01-05",
            completedAt: "2026-01-05T10:00:00Z",
        });
        const [a, b] = log.exercises;
        expect(a.exercise).toEqual({ id: "legacy", name: "Dominadas" });
        expect(a.ref?.source).toBe("catalog");
        expect(a.status).toBe("completed");
        expect(a.sets).toEqual([{ setNumber: 1, actualReps: 10, actualWeight: 0 }]);
        expect(b.ref).toBeUndefined();
        expect(b.status).toBe("failed");
    });

    it("keeps explicit ref, status and plannedExerciseId", () => {
        const log = logFromRow({
            ...legacyRow,
            exercises: [
                {
                    exercise_id: "c1",
                    exercise_name: "Mi ejercicio",
                    ref: { source: "custom", id: "c1" },
                    status: "added",
                    planned_exercise_id: "p9",
                    sets: [],
                },
            ],
        });
        expect(log.exercises[0]).toMatchObject({
            ref: { source: "custom", id: "c1" },
            status: "added",
            plannedExerciseId: "p9",
        });
    });

    it("ignores an unknown status and derives it instead", () => {
        const log = logFromRow({
            ...legacyRow,
            exercises: [
                { exercise_id: "a", exercise_name: "A", status: "bogus", sets: [] },
            ],
        });
        expect(log.exercises[0].status).toBe("failed");
    });

    it("tolerates garbage values and null template_id", () => {
        const log = logFromRow({
            id: "l1",
            user_id: "u1",
            template_id: null,
            date: "2026-01-05",
            completed_at: null,
            exercises: [
                {
                    exercise_id: "a",
                    exercise_name: "A",
                    sets: [{ set_number: "1", actual_reps: "8", actual_weight: "52.5" }, null],
                },
                { exercise_id: "b", exercise_name: "B" },
                42,
            ],
        });
        expect(log.templateId).toBe("");
        expect(log.completedAt).toBeNull();
        expect(log.exercises[0].sets[0]).toEqual({ setNumber: 1, actualReps: 8, actualWeight: 52.5 });
        expect(log.exercises[1].sets).toEqual([]);
    });

    it("does not throw on null or empty input", () => {
        expect(() => logFromRow(null)).not.toThrow();
        expect(logFromRow({}).exercises).toEqual([]);
        expect(logFromRow({ exercises: "bad" }).exercises).toEqual([]);
    });
});

describe("logToRow", () => {
    const log: IWorkoutLog = {
        id: "l1",
        userId: "u1",
        templateId: "t1",
        date: "2026-01-05",
        completedAt: "2026-01-05T10:00:00Z",
        exercises: [
            {
                exercise: { id: "bench-press", name: "Press banca" },
                ref: { source: "catalog", id: "bench-press" },
                status: "replaced",
                plannedExerciseId: "bench-press",
                sets: [{ setNumber: 1, actualReps: 10, actualWeight: 60 }],
            },
        ],
    };

    it("writes snake_case with schema_version 2 and the new fields", () => {
        expect(logToRow(log)).toEqual({
            id: "l1",
            user_id: "u1",
            template_id: "t1",
            date: "2026-01-05",
            completed_at: "2026-01-05T10:00:00Z",
            schema_version: 2,
            exercises: [
                {
                    exercise_id: "bench-press",
                    exercise_name: "Press banca",
                    ref: { source: "catalog", id: "bench-press" },
                    status: "replaced",
                    planned_exercise_id: "bench-press",
                    sets: [{ set_number: 1, actual_reps: 10, actual_weight: 60 }],
                },
            ],
        });
    });

    it("omits absent optional fields and writes empty templateId as null", () => {
        const row = logToRow({
            ...log,
            templateId: "",
            exercises: [{ exercise: { id: "x", name: "X" }, sets: [] }],
        });
        expect(row.template_id).toBeNull();
        expect(row.exercises[0]).toEqual({ exercise_id: "x", exercise_name: "X", sets: [] });
    });

    it("round-trips through logFromRow", () => {
        expect(logFromRow(logToRow(log))).toEqual(log);
    });
});
