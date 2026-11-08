/**
 * Server transport used by the sync engine. Kept as a small interface so the
 * engine logic can be tested with a fake. Implementations throw
 * `SyncTransportError` for any failed call.
 */

import type { SyncCommand } from "@/core/sync";

export class SyncTransportError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly code?: string
    ) {
        super(message);
        this.name = "SyncTransportError";
    }
}

export interface SyncTransport {
    execute(command: SyncCommand): Promise<void>;
    /** Raw `routine_templates` rows of the user. */
    fetchRoutines(userId: string): Promise<unknown[]>;
    /** Raw live (`deleted_at is null`) `custom_exercises` rows of the user. */
    fetchCustomExercises(userId: string): Promise<unknown[]>;
    /** Raw `workout_logs` rows with `date >= sinceDate` (YYYY-MM-DD). */
    fetchLogsSince(userId: string, sinceDate: string): Promise<unknown[]>;
}
