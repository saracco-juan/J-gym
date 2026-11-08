import { customExerciseFromRow, customExerciseToRow } from "../custom-exercise-mapper";

describe("custom exercise mapper", () => {
    it("round-trips a custom exercise", () => {
        const ex = { id: "c1", userId: "u1", name: "Remo", muscleGroup: "back" as const, isBodyweight: false };
        expect(customExerciseFromRow(customExerciseToRow(ex))).toEqual(ex);
    });

    it("writes deleted_at as null", () => {
        const row = customExerciseToRow({ id: "c1", userId: "u1", name: "X", muscleGroup: "core", isBodyweight: true });
        expect(row.deleted_at).toBeNull();
        expect(row.user_id).toBe("u1");
    });

    it("tolerates garbage rows without throwing", () => {
        expect(customExerciseFromRow(null)).toEqual({
            id: "",
            userId: "",
            name: "",
            muscleGroup: "core",
            isBodyweight: false,
        });
        expect(customExerciseFromRow({ id: "c", muscle_group: "nope", is_bodyweight: "yes" }).muscleGroup).toBe("core");
    });
});
