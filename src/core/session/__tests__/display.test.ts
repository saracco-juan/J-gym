import {
    countUnloggedExercises,
    exerciseCardStatus,
    exerciseStatusLabel,
    formatSetValue,
    formatExerciseScheme,
    formatWeight,
    parseSetInput,
    weightFieldLabel,
} from "../display";
import type { SessionExercise, SessionSet } from "../types";

function set(n: number, reps: number, weight: number): SessionSet {
    return { setNumber: n, targetReps: reps, targetWeight: weight, planned: true, logged: null };
}

function exercise(overrides: Partial<SessionExercise>): SessionExercise {
    return {
        key: "e1",
        ref: { source: "catalog", id: "back-squat" },
        name: "Sentadilla con barra",
        isBodyweight: false,
        origin: "planned",
        replacedBy: null,
        skipped: false,
        sets: [],
        ...overrides,
    };
}

describe("formatWeight", () => {
    it("drops trailing zeros", () => {
        expect(formatWeight(20)).toBe("20");
        expect(formatWeight(22.5)).toBe("22.5");
        expect(formatWeight(22.25)).toBe("22.25");
    });
});

describe("formatSetValue", () => {
    it("shows reps x weight for weighted lifts", () => {
        expect(formatSetValue(8, 20, false)).toBe("8 × 20kg");
    });

    it("shows added weight for bodyweight lifts", () => {
        expect(formatSetValue(10, 10, true)).toBe("10 × +10kg");
    });

    it("shows body weight when no extra weight", () => {
        expect(formatSetValue(10, 0, true)).toBe("10 × peso corporal");
    });
});

describe("formatExerciseScheme", () => {
    it("summarizes sets, reps and weight", () => {
        const e = exercise({ sets: [set(1, 8, 20), set(2, 8, 20), set(3, 8, 20), set(4, 8, 20)] });
        expect(formatExerciseScheme(e)).toBe("4×8 · 20kg");
    });

    it("labels added weight on bodyweight lifts", () => {
        const e = exercise({ isBodyweight: true, sets: [set(1, 10, 10), set(2, 10, 10)] });
        expect(formatExerciseScheme(e)).toBe("2×10 · +10kg lastre");
    });

    it("labels pure bodyweight lifts", () => {
        const e = exercise({ isBodyweight: true, sets: [set(1, 12, 0)] });
        expect(formatExerciseScheme(e)).toBe("1×12 · peso corporal");
    });

    it("says there is no target when planned values are zero", () => {
        const e = exercise({ sets: [set(1, 0, 0), set(2, 0, 0)] });
        expect(formatExerciseScheme(e)).toBe("Sin objetivo");
    });

    it("says there are no sets when nothing is planned", () => {
        expect(formatExerciseScheme(exercise({ sets: [] }))).toBe("Sin series");
    });

    it("ignores unplanned extra sets", () => {
        const extra: SessionSet = { ...set(2, 0, 0), planned: false };
        const e = exercise({ sets: [set(1, 8, 20), extra] });
        expect(formatExerciseScheme(e)).toBe("1×8 · 20kg");
    });
});

describe("exerciseStatusLabel", () => {
    it("maps every status to a Spanish label and a tone", () => {
        expect(exerciseStatusLabel("completed")).toEqual({ label: "Completado", tone: "success" });
        expect(exerciseStatusLabel("failed")).toEqual({ label: "Incompleto", tone: "warning" });
        expect(exerciseStatusLabel("skipped")).toEqual({ label: "Salteado", tone: "muted" });
        expect(exerciseStatusLabel("replaced")).toEqual({ label: "Reemplazado", tone: "muted" });
        expect(exerciseStatusLabel("added")).toEqual({ label: "Agregado", tone: "info" });
    });
});

describe("weightFieldLabel", () => {
    it("calls added weight lastre for bodyweight lifts", () => {
        expect(weightFieldLabel(true)).toBe("Lastre (kg)");
        expect(weightFieldLabel(false)).toBe("Peso (kg)");
    });
});

describe("parseSetInput", () => {
    it("parses reps and weight", () => {
        expect(parseSetInput("8", "20", false)).toEqual({ reps: 8, weight: 20 });
    });

    it("accepts a decimal comma", () => {
        expect(parseSetInput("8", "22,5", false)).toEqual({ reps: 8, weight: 22.5 });
    });

    it("rejects empty or invalid reps", () => {
        expect(parseSetInput("", "20", false)).toBeNull();
        expect(parseSetInput("0", "20", false)).toBeNull();
        expect(parseSetInput("8.5", "20", false)).toBeNull();
        expect(parseSetInput("-1", "20", false)).toBeNull();
    });

    it("requires a positive weight for weighted lifts", () => {
        expect(parseSetInput("8", "", false)).toBeNull();
        expect(parseSetInput("8", "0", false)).toBeNull();
        expect(parseSetInput("8", "-5", false)).toBeNull();
    });

    it("treats empty or zero added weight as zero on bodyweight lifts", () => {
        expect(parseSetInput("12", "", true)).toEqual({ reps: 12, weight: 0 });
        expect(parseSetInput("12", "0", true)).toEqual({ reps: 12, weight: 0 });
        expect(parseSetInput("12", "abc", true)).toBeNull();
    });
});

describe("exerciseCardStatus", () => {
    const logged = { reps: 8, weight: 20 };

    it("shows nothing for an untouched exercise", () => {
        expect(exerciseCardStatus(exercise({ sets: [set(1, 8, 20)] }))).toBeNull();
    });

    it("shows completed when every planned set met its targets", () => {
        const e = exercise({ sets: [{ ...set(1, 8, 20), logged }] });
        expect(exerciseCardStatus(e)).toEqual({ label: "Completado", tone: "success" });
    });

    it("shows incomplete when logged below target", () => {
        const e = exercise({ sets: [{ ...set(1, 8, 20), logged: { reps: 6, weight: 20 } }, set(2, 8, 20)] });
        expect(exerciseCardStatus(e)).toEqual({ label: "Incompleto", tone: "warning" });
    });

    it("shows skipped only when the user skipped it", () => {
        const e = exercise({ skipped: true, sets: [set(1, 8, 20)] });
        expect(exerciseCardStatus(e)).toEqual({ label: "Salteado", tone: "muted" });
    });

    it("shows added for an added exercise with logged sets", () => {
        const e = exercise({ origin: "added", sets: [{ ...set(1, 0, 0), planned: false, logged }] });
        expect(exerciseCardStatus(e)).toEqual({ label: "Agregado", tone: "info" });
    });
});

describe("countUnloggedExercises", () => {
    const logged = { reps: 8, weight: 20 };

    it("counts visible exercises with nothing logged and not skipped on purpose", () => {
        const state = {
            exercises: [
                exercise({ key: "a", sets: [{ ...set(1, 8, 20), logged }] }),
                exercise({ key: "b", sets: [set(1, 8, 20)] }),
                exercise({ key: "c", skipped: true, sets: [set(1, 8, 20)] }),
                exercise({ key: "d", replacedBy: "e", sets: [set(1, 8, 20)] }),
                exercise({ key: "e", origin: "replacement", sets: [set(1, 8, 0)] }),
            ],
        };
        expect(countUnloggedExercises(state)).toBe(2);
    });

    it("is zero when everything was logged", () => {
        const state = { exercises: [exercise({ sets: [{ ...set(1, 8, 20), logged }] })] };
        expect(countUnloggedExercises(state)).toBe(0);
    });
});
