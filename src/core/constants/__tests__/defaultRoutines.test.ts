import {
    DEFAULT_ROUTINES,
    mapDefaultRoutineToDays,
} from "../defaultRoutines";

// Characterization tests: they describe the behavior onboarding relies on
// and pass against the existing implementation.

describe("DEFAULT_ROUTINES catalog", () => {
    it("has at least one routine with unique ids", () => {
        expect(DEFAULT_ROUTINES.length).toBeGreaterThan(0);
        const ids = DEFAULT_ROUTINES.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(DEFAULT_ROUTINES.map((r) => [r.id, r] as const))(
        "routine %s has labeled, unique days with exercises",
        (_id, routine) => {
            expect(routine.days.length).toBeGreaterThan(0);
            const labels = routine.days.map((d) => d.label.trim());
            labels.forEach((l) => expect(l).not.toBe(""));
            expect(new Set(labels).size).toBe(labels.length);

            for (const day of routine.days) {
                expect(day.exercises.length).toBeGreaterThan(0);
                const names = day.exercises.map((e) => e.name.trim());
                names.forEach((n) => expect(n).not.toBe(""));
                expect(new Set(names).size).toBe(names.length);
            }
        }
    );

    it("never ships negative sets, reps or weight (zero means seed)", () => {
        for (const routine of DEFAULT_ROUTINES) {
            for (const day of routine.days) {
                for (const e of day.exercises) {
                    expect(e.sets).toBeGreaterThanOrEqual(0);
                    expect(e.reps).toBeGreaterThanOrEqual(0);
                    expect(e.weight).toBeGreaterThanOrEqual(0);
                }
            }
        }
    });
});

describe("mapDefaultRoutineToDays", () => {
    const routine = DEFAULT_ROUTINES[0];

    it("keeps the selected day names and order", () => {
        const days = ["lunes", "miércoles", "viernes"];
        const mapped = mapDefaultRoutineToDays(days);
        expect(mapped.map((m) => m.dayName)).toEqual(days);
    });

    it("assigns routine days in order and cycles when there are more days", () => {
        const selected = Array.from({ length: routine.days.length + 1 }, (_, i) => `d${i}`);
        const mapped = mapDefaultRoutineToDays(selected);
        expect(mapped[0].dayLabel).toBe(routine.days[0].label);
        expect(mapped[routine.days.length].dayLabel).toBe(routine.days[0].label);
    });

    it("returns every seed exercise by name, with empty sets for seeds", () => {
        const [first] = mapDefaultRoutineToDays(["lunes"]);
        expect(first.exercises.map((e) => e.exercise.name)).toEqual(
            routine.days[0].exercises.map((e) => e.name)
        );
        first.exercises.forEach((e) => expect(e.sets).toEqual([]));
    });

    it("attaches a catalog reference to every seed exercise", () => {
        const [first] = mapDefaultRoutineToDays(["lunes"]);
        first.exercises.forEach((e, i) => {
            expect(e.ref).toEqual({
                source: "catalog",
                id: routine.days[0].exercises[i].catalogId,
            });
        });
    });

    it("generates unique exercise ids, even for a repeated day template", () => {
        const mapped = mapDefaultRoutineToDays(
            Array.from({ length: routine.days.length + 1 }, (_, i) => `d${i}`)
        );
        const ids = mapped.flatMap((m) => m.exercises.map((e) => e.exercise.id));
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("expands seeds with sets > 0 into numbered target sets", () => {
        const custom = {
            id: "c",
            name: "c",
            description: "",
            days: [
                {
                    label: "Test",
                    exercises: [{ name: "X", catalogId: "bench-press", sets: 3, reps: 8, weight: 20 }],
                },
            ],
        };
        const [day] = mapDefaultRoutineToDays(["lunes"], custom);
        expect(day.exercises[0].sets).toEqual([
            { setNumber: 1, targetReps: 8, targetWeight: 20 },
            { setNumber: 2, targetReps: 8, targetWeight: 20 },
            { setNumber: 3, targetReps: 8, targetWeight: 20 },
        ]);
    });
});
