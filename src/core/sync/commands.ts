/**
 * Pure translation of an outbox entry into the server write it stands for.
 * Domain payloads go through the core mappers; `user_id` always comes from
 * the session, never from the stored payload.
 */

import type { IProfile, IRoutineTemplate, IWorkoutLog } from "../domain";
import {
    customExerciseToRow,
    dayOverrideToRow,
    logToRow,
    profileToRow,
    routineToRow,
    statsToRow,
    type CustomExerciseWithUser,
    type DayOverrideWithUser,
    type StatsPayload,
} from "../mappers";
import type { OutboxEntry } from "./outbox";

export type SyncTable =
    | "routine_templates"
    | "workout_logs"
    | "custom_exercises"
    | "profiles"
    | "public_stats"
    | "day_overrides";

/**
 * Outbox entity id of a swapped day. Scoped by user so pending writes of two
 * accounts on one device never coalesce into each other.
 */
export function dayOverrideEntityId(userId: string, date: string): string {
    return `${userId}:${date}`;
}

/** Payload of a removed swapped day. */
export interface DayOverrideKey {
    userId: string;
    date: string;
}

export type SyncCommand =
    | {
          kind: "upsert";
          table: SyncTable;
          row: Record<string, unknown>;
          /** Conflict columns when not `id` (profiles and stats: user_id; overrides: user_id,date). */
          onConflict?: string;
      }
    | { kind: "delete"; table: "routine_templates" | "workout_logs"; id: string }
    | { kind: "soft-delete"; table: "custom_exercises"; id: string; deletedAt: string }
    /** Overrides have no id: a removed one is deleted by its owner and date. */
    | { kind: "delete-by-date"; table: "day_overrides"; userId: string; date: string };

export function toSyncCommand(entry: OutboxEntry, userId: string, nowIso: string): SyncCommand {
    if (entry.op === "delete") {
        switch (entry.entity) {
            case "profile":
                throw new Error("A profile is never deleted by the client (it goes with its user).");
            case "stats":
                throw new Error("Public stats are never deleted by the client (they go with their user).");
            case "routine":
                return { kind: "delete", table: "routine_templates", id: entry.entityId };
            case "workoutLog":
                return { kind: "delete", table: "workout_logs", id: entry.entityId };
            case "dayOverride":
                return {
                    kind: "delete-by-date",
                    table: "day_overrides",
                    userId,
                    date: (entry.payload as DayOverrideKey).date,
                };
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
        case "dayOverride":
            return {
                kind: "upsert",
                table: "day_overrides",
                onConflict: "user_id,date",
                row: { ...dayOverrideToRow(entry.payload as DayOverrideWithUser), user_id: userId },
            };
        case "profile":
            return {
                kind: "upsert",
                table: "profiles",
                onConflict: "user_id",
                row: { ...profileToRow(entry.payload as IProfile), user_id: userId },
            };
        case "stats":
            return {
                kind: "upsert",
                table: "public_stats",
                onConflict: "user_id",
                row: { ...statsToRow(entry.payload as StatsPayload), user_id: userId },
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
