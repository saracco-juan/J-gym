/**
 * Local database (IndexedDB via Dexie). The phone is the source of truth;
 * the outbox holds pending writes for the sync engine.
 *
 * Stores domain shapes (camelCase), never Supabase rows. Client-only:
 * use `getDb()`, which opens lazily and refuses to run without IndexedDB
 * (e.g. during SSR), so importing this module on the server is harmless.
 */

import Dexie, { type EntityTable } from "dexie";
import type { CustomExercise } from "@/core/catalog";
import type { IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import type { SessionState } from "@/core/session";
import type { OutboxEntry } from "@/core/sync";

export interface StoredCustomExercise extends CustomExercise {
    userId: string;
}

/** What the session is about, needed to finish it after a restart. */
export interface ActiveSessionMeta {
    templateId: string;
    dayName: string;
    /** Local calendar date (YYYY-MM-DD) the workout started on. */
    date: string;
    startedAt: number;
    /** Fixed at start so finishing twice upserts the same log. */
    logId: string;
}

/** In-progress workout. One per user: `key` is the userId. */
export interface ActiveSessionRecord {
    key: string;
    state: SessionState;
    /** Absent only on records written before the UI used it. */
    meta?: ActiveSessionMeta;
    updatedAt: number;
}

export interface MetaRecord {
    key: string;
    value: unknown;
}

export class JgymDatabase extends Dexie {
    routines!: EntityTable<IRoutineTemplate, "id">;
    customExercises!: EntityTable<StoredCustomExercise, "id">;
    workoutLogs!: EntityTable<IWorkoutLog, "id">;
    activeSession!: EntityTable<ActiveSessionRecord, "key">;
    meta!: EntityTable<MetaRecord, "key">;
    outbox!: EntityTable<OutboxEntry, "id">;

    constructor(name = "jgym") {
        super(name);
        this.version(1).stores({
            routines: "id, userId, dayName",
            customExercises: "id, userId",
            workoutLogs: "id, userId, date",
            activeSession: "key",
            meta: "key",
            outbox: "id, [entity+entityId], nextAttemptAt",
        });
    }
}

let instance: JgymDatabase | null = null;

/** Lazy singleton. Throws when IndexedDB is unavailable (server render). */
export function getDb(): JgymDatabase {
    if (typeof indexedDB === "undefined") {
        throw new Error("Local database is only available in the browser.");
    }
    if (!instance) instance = new JgymDatabase();
    return instance;
}
