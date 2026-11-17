import type { IRoutineTemplate } from "../../domain";
import {
    addDay,
    addExercise,
    availableWeekdays,
    draftFromTemplates,
    moveExercise,
    planRoutineSave,
    removeDay,
    removeExercise,
    updateExercise,
    validateDraft,
    weekdayLabel,
    type DraftDay,
} from "../editor";

function template(
    id: string,
    dayName: string,
    exercises: IRoutineTemplate["exercises"] = []
): IRoutineTemplate {
    return { id, userId: "u1", dayName, exercises };
}

const bench: IRoutineTemplate["exercises"][number] = {
    exercise: { id: "ex-bench", name: "Press banca" },
    ref: { source: "catalog", id: "bench-press" },
    sets: [
        { setNumber: 1, targetReps: 8, targetWeight: 60 },
        { setNumber: 2, targetReps: 8, targetWeight: 60 },
        { setNumber: 3, targetReps: 8, targetWeight: 60 },
    ],
};

const row: IRoutineTemplate["exercises"][number] = {
    exercise: { id: "ex-row", name: "Remo con barra" },
    ref: { source: "catalog", id: "barbell-row" },
    sets: [{ setNumber: 1, targetReps: 10, targetWeight: 0 }],
};

const monday = template("r-mon", "lunes", [bench, row]);
const wednesday = template("r-wed", "miércoles", [row]);

describe("weekdayLabel", () => {
    it("capitalizes the weekday name", () => {
        expect(weekdayLabel("miércoles")).toBe("Miércoles");
    });
});

describe("draftFromTemplates", () => {
    it("builds a draft per routine with text fields, ordered Monday first", () => {
        const draft = draftFromTemplates([template("r-sun", "domingo", [row]), wednesday, monday]);
        expect(draft.map((d) => d.dayName)).toEqual(["lunes", "miércoles", "domingo"]);
        expect(draft[0].id).toBe("r-mon");
        expect(draft[0].exercises[0]).toMatchObject({
            id: "ex-bench",
            name: "Press banca",
            ref: { source: "catalog", id: "bench-press" },
            sets: "3",
            reps: "8",
            weight: "60",
        });
    });

    it("shows an empty weight for a zero target and keeps decimals", () => {
        const draft = draftFromTemplates([
            template("r", "lunes", [
                row,
                {
                    ...bench,
                    exercise: { id: "x", name: "Otro" },
                    sets: [{ setNumber: 1, targetReps: 5, targetWeight: 62.5 }],
                },
            ]),
        ]);
        expect(draft[0].exercises[0].weight).toBe("");
        expect(draft[0].exercises[1].weight).toBe("62.5");
    });

    it("keeps the catalog ref and resolves it from the name of legacy exercises", () => {
        const [day] = draftFromTemplates([
            template("r", "lunes", [
                { exercise: { id: "legacy", name: "Press banca" }, sets: [] },
                { exercise: { id: "free", name: "Remo raro" }, sets: [] },
            ]),
        ]);
        expect(day.exercises[0].ref).toEqual({ source: "catalog", id: "bench-press" });
        expect(day.exercises[1].ref).toBeUndefined();
    });

    it("flags bodyweight catalog exercises", () => {
        const [day] = draftFromTemplates([
            template("r", "lunes", [
                { exercise: { id: "p", name: "Dominadas" }, ref: { source: "catalog", id: "pull-up" }, sets: [] },
            ]),
        ]);
        expect(day.exercises[0].isBodyweight).toBe(true);
    });
});

describe("day operations", () => {
    const draft = draftFromTemplates([monday, wednesday]);

    it("lists the weekdays that are not used yet, in week order", () => {
        expect(availableWeekdays(draft)).toEqual(["martes", "jueves", "viernes", "sábado", "domingo"]);
    });

    it("adds an empty day for an unused weekday, keeping week order", () => {
        const next = addDay(draft, "martes", "new-id");
        expect(next.map((d) => d.dayName)).toEqual(["lunes", "martes", "miércoles"]);
        expect(next[1]).toEqual({ id: "new-id", dayName: "martes", exercises: [] });
    });

    it("refuses a weekday that is already used or unknown", () => {
        expect(addDay(draft, "lunes", "x")).toBe(draft);
        expect(addDay(draft, "funday", "x")).toBe(draft);
    });

    it("removes a day by id", () => {
        expect(removeDay(draft, "r-mon").map((d) => d.dayName)).toEqual(["miércoles"]);
        expect(removeDay(draft, "missing")).toEqual(draft);
    });

    it("does not mutate its input", () => {
        const snapshot = JSON.stringify(draft);
        addDay(draft, "martes", "n");
        removeDay(draft, "r-mon");
        expect(JSON.stringify(draft)).toBe(snapshot);
    });
});

describe("exercise operations", () => {
    const draft = draftFromTemplates([monday]);

    it("appends an exercise with default targets and keeps its ref", () => {
        const next = addExercise(
            draft,
            "r-mon",
            { ref: { source: "catalog", id: "back-squat" }, name: "Sentadilla con barra", isBodyweight: false },
            "ex-new"
        );
        expect(next[0].exercises[2]).toEqual({
            id: "ex-new",
            name: "Sentadilla con barra",
            ref: { source: "catalog", id: "back-squat" },
            isBodyweight: false,
            sets: "3",
            reps: "10",
            weight: "",
        });
    });

    it("removes an exercise", () => {
        expect(removeExercise(draft, "r-mon", "ex-bench")[0].exercises.map((e) => e.id)).toEqual(["ex-row"]);
    });

    it("moves an exercise up and down, and ignores moves past the ends", () => {
        const down = moveExercise(draft, "r-mon", "ex-bench", "down");
        expect(down[0].exercises.map((e) => e.id)).toEqual(["ex-row", "ex-bench"]);
        const up = moveExercise(down, "r-mon", "ex-bench", "up");
        expect(up[0].exercises.map((e) => e.id)).toEqual(["ex-bench", "ex-row"]);
        expect(moveExercise(draft, "r-mon", "ex-bench", "up")).toEqual(draft);
        expect(moveExercise(draft, "r-mon", "ex-row", "down")).toEqual(draft);
    });

    it("updates the sets, reps or weight text of one exercise only", () => {
        const next = updateExercise(draft, "r-mon", "ex-bench", { reps: "12", weight: "65" });
        expect(next[0].exercises[0]).toMatchObject({ sets: "3", reps: "12", weight: "65" });
        expect(next[0].exercises[1]).toEqual(draft[0].exercises[1]);
    });

    it("leaves other days untouched", () => {
        const two = draftFromTemplates([monday, wednesday]);
        const next = removeExercise(two, "r-mon", "ex-bench");
        expect(next[1]).toBe(two[1]);
    });
});

describe("validateDraft", () => {
    const valid = draftFromTemplates([monday, wednesday]);

    it("accepts a complete draft", () => {
        expect(validateDraft(valid)).toEqual([]);
    });

    it("requires at least one day", () => {
        expect(validateDraft([])).toEqual([
            {
                dayId: "",
                exerciseId: null,
                field: "days",
                message: "La rutina necesita al menos un día de entrenamiento.",
            },
        ]);
    });

    it("requires at least one exercise per day, naming the day", () => {
        const issues = validateDraft(addDay(valid, "martes", "r-tue"));
        expect(issues).toEqual([
            {
                dayId: "r-tue",
                exerciseId: null,
                field: "exercises",
                message: "Martes no tiene ejercicios. Agrega al menos uno o elimina el día.",
            },
        ]);
    });

    it("rejects sets that are empty, zero, fractional, text or too many", () => {
        for (const sets of ["", "0", "2.5", "abc", "11", "-1"]) {
            const issues = validateDraft(updateExercise(valid, "r-mon", "ex-bench", { sets }));
            expect(issues).toHaveLength(1);
            expect(issues[0]).toMatchObject({ dayId: "r-mon", exerciseId: "ex-bench", field: "sets" });
            expect(issues[0].message).toBe("Series: ingresa un número entero entre 1 y 10.");
        }
    });

    it("rejects reps outside 1 to 100", () => {
        for (const reps of ["", "0", "8.5", "101"]) {
            const issues = validateDraft(updateExercise(valid, "r-mon", "ex-bench", { reps }));
            expect(issues).toHaveLength(1);
            expect(issues[0]).toMatchObject({ field: "reps" });
            expect(issues[0].message).toBe("Repeticiones: ingresa un número entero entre 1 y 100.");
        }
    });

    it("accepts an empty weight, decimals with dot or comma, and rejects the rest", () => {
        for (const weight of ["", "0", "62.5", "62,5", "1000"]) {
            expect(validateDraft(updateExercise(valid, "r-mon", "ex-bench", { weight }))).toEqual([]);
        }
        for (const weight of ["abc", "-5", "1001", "6,2,5", "62.5kg"]) {
            const issues = validateDraft(updateExercise(valid, "r-mon", "ex-bench", { weight }));
            expect(issues).toHaveLength(1);
            expect(issues[0]).toMatchObject({ field: "weight" });
            expect(issues[0].message).toBe("Peso: ingresa un número entre 0 y 1000, por ejemplo 62,5.");
        }
    });

    it("reports every problem of every exercise", () => {
        const draft = updateExercise(
            updateExercise(valid, "r-mon", "ex-bench", { sets: "0", reps: "" }),
            "r-wed",
            "ex-row",
            { weight: "x" }
        );
        expect(validateDraft(draft).map((i) => `${i.dayId}:${i.field}`)).toEqual([
            "r-mon:sets",
            "r-mon:reps",
            "r-wed:weight",
        ]);
    });
});

describe("planRoutineSave", () => {
    const original = [monday, wednesday];
    const plan = (draft: DraftDay[], source: IRoutineTemplate[] = original) =>
        planRoutineSave({ userId: "u1", original: source, draft });

    it("plans nothing when the draft is untouched", () => {
        expect(plan(draftFromTemplates(original))).toEqual({ upserts: [], deletes: [] });
    });

    it("upserts only the changed day and keeps untouched exercises exactly as stored", () => {
        const draft = updateExercise(draftFromTemplates(original), "r-mon", "ex-row", { reps: "12" });
        const result = plan(draft);
        expect(result.deletes).toEqual([]);
        expect(result.upserts).toHaveLength(1);
        const [saved] = result.upserts;
        expect(saved).toMatchObject({ id: "r-mon", userId: "u1", dayName: "lunes" });
        expect(saved.exercises[0]).toEqual(bench);
        expect(saved.exercises[1]).toEqual({
            exercise: { id: "ex-row", name: "Remo con barra" },
            ref: { source: "catalog", id: "barbell-row" },
            sets: [{ setNumber: 1, targetReps: 12, targetWeight: 0 }],
        });
    });

    it("keeps per-set targets of an exercise whose scheme was not edited", () => {
        const mixed = template("r-mon", "lunes", [
            {
                exercise: { id: "ex-bench", name: "Press banca" },
                ref: { source: "catalog", id: "bench-press" },
                sets: [
                    { setNumber: 1, targetReps: 8, targetWeight: 60 },
                    { setNumber: 2, targetReps: 6, targetWeight: 65 },
                ],
            },
            row,
        ]);
        const draft = moveExercise(draftFromTemplates([mixed]), "r-mon", "ex-row", "up");
        const result = plan(draft, [mixed]);
        expect(result.upserts[0].exercises[1].sets).toEqual(mixed.exercises[0].sets);
    });

    it("rebuilds the sets when sets, reps or weight changed", () => {
        const draft = updateExercise(draftFromTemplates(original), "r-mon", "ex-bench", {
            sets: "4",
            reps: "6",
            weight: "62,5",
        });
        const [saved] = plan(draft).upserts;
        expect(saved.exercises[0].sets).toEqual([
            { setNumber: 1, targetReps: 6, targetWeight: 62.5 },
            { setNumber: 2, targetReps: 6, targetWeight: 62.5 },
            { setNumber: 3, targetReps: 6, targetWeight: 62.5 },
            { setNumber: 4, targetReps: 6, targetWeight: 62.5 },
        ]);
    });

    it("saves reordering", () => {
        const draft = moveExercise(draftFromTemplates(original), "r-mon", "ex-bench", "down");
        const [saved] = plan(draft).upserts;
        expect(saved.exercises.map((e) => e.exercise.id)).toEqual(["ex-row", "ex-bench"]);
    });

    it("creates new days and exercises with their catalog ref", () => {
        let draft = addDay(draftFromTemplates(original), "viernes", "r-fri");
        draft = addExercise(
            draft,
            "r-fri",
            { ref: { source: "catalog", id: "back-squat" }, name: "Sentadilla con barra", isBodyweight: false },
            "ex-squat"
        );
        draft = updateExercise(draft, "r-fri", "ex-squat", { sets: "5", reps: "5", weight: "100" });
        const result = plan(draft);
        expect(result.deletes).toEqual([]);
        expect(result.upserts).toEqual([
            {
                id: "r-fri",
                userId: "u1",
                dayName: "viernes",
                exercises: [
                    {
                        exercise: { id: "ex-squat", name: "Sentadilla con barra" },
                        ref: { source: "catalog", id: "back-squat" },
                        sets: Array.from({ length: 5 }, (_, i) => ({
                            setNumber: i + 1,
                            targetReps: 5,
                            targetWeight: 100,
                        })),
                    },
                ],
            },
        ]);
    });

    it("keeps a custom exercise ref", () => {
        let draft = addDay(draftFromTemplates(original), "viernes", "r-fri");
        draft = addExercise(
            draft,
            "r-fri",
            { ref: { source: "custom", id: "uuid-9" }, name: "Remo en anillas", isBodyweight: true },
            "ex-rings"
        );
        const [saved] = plan(draft).upserts;
        expect(saved.exercises[0].ref).toEqual({ source: "custom", id: "uuid-9" });
    });

    it("deletes the routines of removed days", () => {
        const draft = removeDay(draftFromTemplates(original), "r-wed");
        expect(plan(draft)).toEqual({ upserts: [], deletes: ["r-wed"] });
    });

    it("reuses the stored id when a removed weekday is added back, instead of delete plus create", () => {
        let draft = removeDay(draftFromTemplates(original), "r-wed");
        draft = addDay(draft, "miércoles", "fresh-id");
        draft = addExercise(
            draft,
            "fresh-id",
            { ref: { source: "catalog", id: "back-squat" }, name: "Sentadilla con barra", isBodyweight: false },
            "ex-squat"
        );
        const result = plan(draft);
        expect(result.deletes).toEqual([]);
        expect(result.upserts).toHaveLength(1);
        expect(result.upserts[0]).toMatchObject({ id: "r-wed", dayName: "miércoles" });
        expect(result.upserts[0].exercises[0].exercise.name).toBe("Sentadilla con barra");
    });

    it("writes the ref resolved from a legacy name when a day with such exercises is edited", () => {
        const legacy = template("r-leg", "lunes", [
            { exercise: { id: "e1", name: "Press banca" }, sets: [{ setNumber: 1, targetReps: 8, targetWeight: 40 }] },
        ]);
        const draft = updateExercise(draftFromTemplates([legacy]), "r-leg", "e1", { weight: "42,5" });
        const result = plan(draft, [legacy]);
        expect(result.upserts[0].exercises[0].ref).toEqual({ source: "catalog", id: "bench-press" });
    });
});
