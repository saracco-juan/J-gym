import { deriveExerciseStatus } from "../derive-exercise-status";
import type { LoggedSet, SessionExercise, SessionSet } from "../types";

function set(n: number, logged: LoggedSet | null, target = { reps: 10, weight: 50 }): SessionSet {
    return {
        setNumber: n,
        targetReps: target.reps,
        targetWeight: target.weight,
        planned: true,
        logged,
    };
}

function exercise(overrides: Partial<SessionExercise> = {}): SessionExercise {
    return {
        key: "e1",
        ref: { source: "catalog", id: "bench-press" },
        name: "Press banca",
        isBodyweight: false,
        origin: "planned",
        replacedBy: null,
        skipped: false,
        sets: [set(1, null), set(2, null)],
        ...overrides,
    };
}

const MET: LoggedSet = { reps: 10, weight: 50 };

describe("deriveExerciseStatus", () => {
    it("is completed when every planned set meets its targets", () => {
        expect(deriveExerciseStatus(exercise({ sets: [set(1, MET), set(2, MET)] }))).toBe("completed");
    });

    it("counts exceeding the targets as completed", () => {
        const better = { reps: 12, weight: 55 };
        expect(deriveExerciseStatus(exercise({ sets: [set(1, better), set(2, better)] }))).toBe("completed");
    });

    it("is failed when only some sets are logged", () => {
        expect(deriveExerciseStatus(exercise({ sets: [set(1, MET), set(2, null)] }))).toBe("failed");
    });

    it("is failed when a set is logged below target reps", () => {
        expect(
            deriveExerciseStatus(exercise({ sets: [set(1, MET), set(2, { reps: 8, weight: 50 })] }))
        ).toBe("failed");
    });

    it("is failed when a set is logged below target weight", () => {
        expect(
            deriveExerciseStatus(exercise({ sets: [set(1, MET), set(2, { reps: 10, weight: 45 })] }))
        ).toBe("failed");
    });

    it("is skipped when explicitly skipped", () => {
        expect(deriveExerciseStatus(exercise({ skipped: true }))).toBe("skipped");
    });

    it("is skipped when nothing was logged", () => {
        expect(deriveExerciseStatus(exercise())).toBe("skipped");
    });

    it("is replaced when a replacement took over", () => {
        expect(deriveExerciseStatus(exercise({ replacedBy: "r1" }))).toBe("replaced");
    });

    it("is added for an added exercise with logged sets", () => {
        const ex = exercise({ origin: "added", sets: [set(1, MET)] });
        expect(deriveExerciseStatus(ex)).toBe("added");
    });

    it("is added for a replacement with logged sets, even below target", () => {
        const ex = exercise({
            origin: "replacement",
            plannedExerciseId: "p1",
            sets: [set(1, { reps: 3, weight: 5 }), set(2, null)],
        });
        expect(deriveExerciseStatus(ex)).toBe("added");
    });

    it("is skipped for an added exercise with nothing logged", () => {
        expect(deriveExerciseStatus(exercise({ origin: "added" }))).toBe("skipped");
    });

    it("ignores unplanned extra sets when checking targets", () => {
        const extra: SessionSet = { ...set(3, { reps: 2, weight: 10 }), planned: false };
        expect(
            deriveExerciseStatus(exercise({ sets: [set(1, MET), set(2, MET), extra] }))
        ).toBe("completed");
    });

    it("is completed for a seed exercise whose sets were all added by the user", () => {
        const extra: SessionSet = {
            setNumber: 1,
            targetReps: 0,
            targetWeight: 0,
            planned: false,
            logged: { reps: 8, weight: 30 },
        };
        expect(deriveExerciseStatus(exercise({ sets: [extra] }))).toBe("completed");
    });
});
