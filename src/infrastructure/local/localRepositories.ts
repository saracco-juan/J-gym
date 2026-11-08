/**
 * Local repositories over Dexie. Every write to a synced table runs in one
 * transaction together with its outbox entry (coalesced by the pure
 * `coalesceEntry`), so data and queue commit atomically or not at all.
 *
 * Outbox payloads are domain objects (not DB rows); the sync engine maps
 * them with the core mappers before sending.
 *
 * Not wired to the UI yet.
 */

import type { CustomExercise } from "@/core/catalog";
import type { IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import type { SessionState } from "@/core/session";
import {
    coalesceEntry,
    markFailed,
    nextBatch,
    type OutboxEntity,
    type OutboxEntry,
    type OutboxOp,
} from "@/core/sync";
import {
    getDb,
    type ActiveSessionRecord,
    type JgymDatabase,
    type StoredCustomExercise,
} from "./db";

export interface LocalDeps {
    now: () => number;
    newId: () => string;
}

const defaultDeps: LocalDeps = {
    now: () => Date.now(),
    newId: () => crypto.randomUUID(),
};

export function createLocalRepositories(
    db: JgymDatabase = getDb(),
    deps: LocalDeps = defaultDeps
) {
    /** Must run inside a transaction that includes `db.outbox`. */
    async function enqueueWrite(
        entity: OutboxEntity,
        entityId: string,
        op: OutboxOp,
        payload: unknown
    ): Promise<void> {
        const existing = await db.outbox
            .where("[entity+entityId]")
            .equals([entity, entityId])
            .first();
        const entry = coalesceEntry(existing, {
            id: deps.newId(),
            entity,
            entityId,
            op,
            payload,
            now: deps.now(),
        });
        if (existing) await db.outbox.delete(existing.id);
        await db.outbox.add(entry);
    }

    const routines = {
        get: (id: string) => db.routines.get(id),
        getByDay: (userId: string, dayName: string) =>
            db.routines.where({ userId, dayName }).first(),
        listByUser: (userId: string) => db.routines.where("userId").equals(userId).toArray(),
        async save(routine: IRoutineTemplate): Promise<void> {
            await db.transaction("rw", [db.routines, db.outbox], async () => {
                await db.routines.put(routine);
                await enqueueWrite("routine", routine.id, "upsert", routine);
            });
        },
        async remove(id: string): Promise<void> {
            await db.transaction("rw", [db.routines, db.outbox], async () => {
                await db.routines.delete(id);
                await enqueueWrite("routine", id, "delete", null);
            });
        },
    };

    const customExercises = {
        get: (id: string) => db.customExercises.get(id),
        listByUser: (userId: string) =>
            db.customExercises.where("userId").equals(userId).toArray(),
        /** Creates a custom exercise with a fresh client-side UUID. */
        async create(userId: string, data: Omit<CustomExercise, "id">): Promise<StoredCustomExercise> {
            const record: StoredCustomExercise = { ...data, id: deps.newId(), userId };
            await this.save(record);
            return record;
        },
        async save(record: StoredCustomExercise): Promise<void> {
            await db.transaction("rw", [db.customExercises, db.outbox], async () => {
                await db.customExercises.put(record);
                await enqueueWrite("customExercise", record.id, "upsert", record);
            });
        },
        async remove(id: string): Promise<void> {
            await db.transaction("rw", [db.customExercises, db.outbox], async () => {
                await db.customExercises.delete(id);
                await enqueueWrite("customExercise", id, "delete", null);
            });
        },
    };

    const workoutLogs = {
        get: (id: string) => db.workoutLogs.get(id),
        getByDate: (userId: string, date: string) =>
            db.workoutLogs.where("userId").equals(userId).and((l) => l.date === date).first(),
        listByUser: (userId: string) => db.workoutLogs.where("userId").equals(userId).toArray(),
        async save(log: IWorkoutLog): Promise<void> {
            await db.transaction("rw", [db.workoutLogs, db.outbox], async () => {
                await db.workoutLogs.put(log);
                await enqueueWrite("workoutLog", log.id, "upsert", log);
            });
        },
        async remove(id: string): Promise<void> {
            await db.transaction("rw", [db.workoutLogs, db.outbox], async () => {
                await db.workoutLogs.delete(id);
                await enqueueWrite("workoutLog", id, "delete", null);
            });
        },
    };

    /** In-progress session: local only, never synced (no outbox entry). */
    const activeSession = {
        get: (userId: string): Promise<ActiveSessionRecord | undefined> =>
            db.activeSession.get(userId),
        async put(userId: string, state: SessionState): Promise<void> {
            await db.activeSession.put({ key: userId, state, updatedAt: deps.now() });
        },
        async clear(userId: string): Promise<void> {
            await db.activeSession.delete(userId);
        },
    };

    const meta = {
        async get<T = unknown>(key: string): Promise<T | undefined> {
            return (await db.meta.get(key))?.value as T | undefined;
        },
        async set(key: string, value: unknown): Promise<void> {
            await db.meta.put({ key, value });
        },
    };

    /** Queue access for the sync engine. */
    const outbox = {
        list: () => db.outbox.toArray(),
        async dueBatch(now: number): Promise<OutboxEntry[]> {
            return nextBatch(await db.outbox.toArray(), now);
        },
        /** Removes the entry only if it is still the one that was sent (same id). */
        async complete(id: string): Promise<void> {
            await db.outbox.delete(id);
        },
        /** Backs the entry off; a no-op when it was coalesced or completed meanwhile. */
        async fail(id: string, error: string, now: number, jitter: number): Promise<void> {
            await db.transaction("rw", db.outbox, async () => {
                const current = await db.outbox.get(id);
                if (current) await db.outbox.put(markFailed(current, error, now, jitter));
            });
        },
    };

    return { routines, customExercises, workoutLogs, activeSession, meta, outbox };
}

export type LocalRepositories = ReturnType<typeof createLocalRepositories>;

/** Lazy singleton for app code. Client-only. */
let shared: LocalRepositories | null = null;
export function getLocalRepositories(): LocalRepositories {
    if (!shared) shared = createLocalRepositories();
    return shared;
}
