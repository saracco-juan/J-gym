/**
 * Supabase implementation of the sync transport. Works with the browser
 * client: the session lives in local storage and is attached automatically.
 */

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { SyncCommand } from "@/core/sync";
import { SyncTransportError, type SyncTransport } from "./transport";

function toError(error: PostgrestError | { message: string }, status?: number): SyncTransportError {
    const code = "code" in error ? error.code : undefined;
    return new SyncTransportError(error.message, status, code || undefined);
}

export function createSupabaseTransport(client: SupabaseClient): SyncTransport {
    async function run(
        request: PromiseLike<{ error: PostgrestError | null; status: number }>
    ): Promise<void> {
        let result: { error: PostgrestError | null; status: number };
        try {
            result = await request;
        } catch (e) {
            // fetch rejected: the device cannot reach the server.
            throw new SyncTransportError(e instanceof Error ? e.message : "Network error", 0);
        }
        if (result.error) throw toError(result.error, result.status);
    }

    async function select(
        request: PromiseLike<{ data: unknown[] | null; error: PostgrestError | null; status: number }>
    ): Promise<unknown[]> {
        let result: { data: unknown[] | null; error: PostgrestError | null; status: number };
        try {
            result = await request;
        } catch (e) {
            throw new SyncTransportError(e instanceof Error ? e.message : "Network error", 0);
        }
        if (result.error) throw toError(result.error, result.status);
        return result.data ?? [];
    }

    return {
        async execute(command: SyncCommand): Promise<void> {
            switch (command.kind) {
                case "upsert":
                    return run(client.from(command.table).upsert(command.row, { onConflict: "id" }));
                case "delete":
                    return run(client.from(command.table).delete().eq("id", command.id));
                case "soft-delete":
                    return run(
                        client
                            .from(command.table)
                            .update({ deleted_at: command.deletedAt })
                            .eq("id", command.id)
                    );
            }
        },
        fetchRoutines: (userId) =>
            select(client.from("routine_templates").select("*").eq("user_id", userId)),
        fetchCustomExercises: (userId) =>
            select(
                client.from("custom_exercises").select("*").eq("user_id", userId).is("deleted_at", null)
            ),
        fetchLogsSince: (userId, sinceDate) =>
            select(
                client
                    .from("workout_logs")
                    .select("*")
                    .eq("user_id", userId)
                    .gte("date", sinceDate)
                    .order("date", { ascending: false })
            ),
    };
}
