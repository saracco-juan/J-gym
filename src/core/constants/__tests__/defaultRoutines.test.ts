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

describe("gym routine content", () => {
    const gym = DEFAULT_ROUTINES.find((r) => r.id === "gym")!;
    const summarize = (label: string) =>
        gym.days
            .find((d) => d.label === label)!
            .exercises.map((e) => [e.catalogId, e.sets, e.reps, e.weight]);

    it("has exactly four days in the expected order", () => {
        expect(gym.days.map((d) => d.label)).toEqual([
            "Cardio",
            "Piernas",
            "Pecho / Hombros",
            "Espalda / Hombros",
        ]);
    });

    it("starts with a single 1x1 cardio entry", () => {
        expect(summarize("Cardio")).toEqual([["cardio", 1, 1, 0]]);
    });

    it("defines the legs day", () => {
        expect(summarize("Piernas")).toEqual([
            ["back-squat", 3, 8, 0],
            ["leg-extension", 3, 10, 0],
            ["leg-curl", 3, 10, 0],
            ["calf-raise", 3, 15, 0],
            ["leg-press", 3, 8, 0],
        ]);
    });

    it("defines the chest / shoulders day as 4x10", () => {
        expect(summarize("Pecho / Hombros")).toEqual([
            ["bench-press", 4, 10, 0],
            ["incline-bench-press", 4, 10, 0],
            ["dumbbell-fly", 4, 10, 0],
            ["machine-shoulder-press", 4, 10, 0],
            ["cable-lateral-raise", 4, 10, 0],
        ]);
    });

    it("defines the back / shoulders day as 4x8", () => {
        expect(summarize("Espalda / Hombros")).toEqual([
            ["lat-pulldown", 4, 8, 0],
            ["seated-cable-row", 4, 8, 0],
            ["rear-delt-fly", 4, 8, 0],
            ["dumbbell-shoulder-press", 4, 8, 0],
            ["lateral-raise", 4, 8, 0],
        ]);
    });

    it("never prefills a weight: each user enters their own", () => {
        gym.days.forEach((d) => d.exercises.forEach((e) => expect(e.weight).toBe(0)));
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

    it("returns every seed exercise by name, with its target sets expanded", () => {
        const [first] = mapDefaultRoutineToDays(["lunes"]);
        expect(first.exercises.map((e) => e.exercise.name)).toEqual(
            routine.days[0].exercises.map((e) => e.name)
        );
        first.exercises.forEach((e, i) => {
            const seed = routine.days[0].exercises[i];
            expect(e.sets).toHaveLength(seed.sets);
            e.sets.forEach((set, n) =>
                expect(set).toEqual({
                    setNumber: n + 1,
                    targetReps: seed.reps,
                    targetWeight: 0,
                })
            );
        });
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
