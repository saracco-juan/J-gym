import type { CustomExercise, MuscleGroup } from "../catalog";
import { asRecord, asString } from "./coerce";

const MUSCLE_GROUPS: readonly MuscleGroup[] = [
    "chest",
    "back",
    "legs",
    "glutes",
    "shoulders",
    "arms",
    "core",
];

export type CustomExerciseWithUser = CustomExercise & { userId: string };

export interface CustomExerciseRow {
    id: string;
    user_id: string;
    name: string;
    muscle_group: string;
    is_bodyweight: boolean;
    deleted_at: string | null;
}

/** Never throws. Unknown muscle groups fall back to "core". */
export function customExerciseFromRow(row: unknown): CustomExerciseWithUser {
    const rec = asRecord(row);
    return {
        id: asString(rec.id),
        userId: asString(rec.user_id),
        name: asString(rec.name),
        muscleGroup: MUSCLE_GROUPS.find((g) => g === rec.muscle_group) ?? "core",
        isBodyweight: rec.is_bodyweight === true,
    };
}

/** Upserting a live exercise always clears `deleted_at`. */
export function customExerciseToRow(ex: CustomExerciseWithUser): CustomExerciseRow {
    return {
        id: ex.id,
        user_id: ex.userId,
        name: ex.name,
        muscle_group: ex.muscleGroup,
        is_bodyweight: ex.isBodyweight,
        deleted_at: null,
    };
}
