/**
 * Pure translation of an outbox entry into the server write it stands for.
 * Domain payloads go through the core mappers; `user_id` always comes from
 * the session, never from the stored payload.
 */

import type { IRoutineTemplate, IWorkoutLog } from "../domain";
import {
    customExerciseToRow,
    logToRow,
    routineToRow,
    type CustomExerciseWithUser,
} from "../mappers";
import type { OutboxEntry } from "./outbox";

export type SyncTable = "routine_templates" | "workout_logs" | "custom_exercises";

export type SyncCommand =
    | { kind: "upsert"; table: SyncTable; row: Record<string, unknown> }
    | { kind: "delete"; table: "routine_templates" | "workout_logs"; id: string }
    | { kind: "soft-delete"; table: "custom_exercises"; id: string; deletedAt: string };

export function toSyncCommand(entry: OutboxEntry, userId: string, nowIso: string): SyncCommand {
    if (entry.op === "delete") {
        switch (entry.entity) {
            case "routine":
                return { kind: "delete", table: "routine_templates", id: entry.entityId };
            case "workoutLog":
                return { kind: "delete", table: "workout_logs", id: entry.entityId };
            case "customExercise":
                return {
                    kind: "soft-delete",
                    table: "custom_exercises",
                    id: entry.entityId,
                    deletedAt: nowIso,
                };
        }
    }
    switch (entry.entity) {
        case "routine":
            return {
                kind: "upsert",
                table: "routine_templates",
                row: { ...routineToRow(entry.payload as IRoutineTemplate), user_id: userId },
            };
        case "workoutLog":
            return {
                kind: "upsert",
                table: "workout_logs",
                row: { ...logToRow(entry.payload as IWorkoutLog), user_id: userId },
            };
        case "customExercise":
            return {
                kind: "upsert",
                table: "custom_exercises",
                row: {
                    ...customExerciseToRow(entry.payload as CustomExerciseWithUser),
                    user_id: userId,
                },
            };
    }
}

/**
 * Fallback for a log whose routine no longer exists on the server (foreign
 * key violation): the column is nullable (ON DELETE SET NULL), so send the
 * log detached. Null for any other command.
 */
export function detachTemplate(command: SyncCommand): SyncCommand | null {
    if (command.kind !== "upsert" || command.table !== "workout_logs") return null;
    return { ...command, row: { ...command.row, template_id: null } };
}
