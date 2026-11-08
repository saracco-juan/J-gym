/**
 * Local repositories over Dexie. Every write to a synced table runs in one
 * transaction together with its outbox entry (coalesced by the pure
 * `coalesceEntry`), so data and queue commit atomically or not at all.
 *
 * Outbox payloads are domain objects (not DB rows); the sync engine maps
 * them with the core mappers before sending.
 *
 * Every synced write calls `deps.onWrite` once committed, so the sync engine
 * can schedule a flush without the call sites knowing about it.
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
    type ActiveSessionMeta,
    type ActiveSessionRecord,
    type JgymDatabase,
    type StoredCustomExercise,
} from "./db";

export interface LocalDeps {
    now: () => number;
    newId: () => string;
    /** Called after a synced write committed (data + outbox entry). */
    onWrite?: () => void;
}

const writeListeners = new Set<() => void>();

/** Subscribes to committed local writes of the shared repositories. */
export function subscribeLocalWrites(listener: () => void): () => void {
    writeListeners.add(listener);
    return () => {
        writeListeners.delete(listener);
    };
}

const defaultDeps: LocalDeps = {
    now: () => Date.now(),
    newId: () => crypto.randomUUID(),
    onWrite: () => writeListeners.forEach((fn) => fn()),
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

    const notify = () => deps.onWrite?.();

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
            notify();
        },
        async remove(id: string): Promise<void> {
            await db.transaction("rw", [db.routines, db.outbox], async () => {
                await db.routines.delete(id);
                await enqueueWrite("routine", id, "delete", null);
            });
            notify();
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
            notify();
        },
        async remove(id: string): Promise<void> {
            await db.transaction("rw", [db.customExercises, db.outbox], async () => {
                await db.customExercises.delete(id);
                await enqueueWrite("customExercise", id, "delete", null);
            });
            notify();
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
            notify();
        },
        async remove(id: string): Promise<void> {
            await db.transaction("rw", [db.workoutLogs, db.outbox], async () => {
                await db.workoutLogs.delete(id);
                await enqueueWrite("workoutLog", id, "delete", null);
            });
            notify();
        },
    };

    /** In-progress session: local only, never synced (no outbox entry). */
    const activeSession = {
        get: (userId: string): Promise<ActiveSessionRecord | undefined> =>
            db.activeSession.get(userId),
        async put(userId: string, state: SessionState, meta?: ActiveSessionMeta): Promise<void> {
            await db.activeSession.put({
                key: userId,
                state,
                ...(meta ? { meta } : {}),
                updatedAt: deps.now(),
            });
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
        count: () => db.outbox.count(),
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

    /** Support for the sync engine: server-originated writes and maintenance. */
    const sync = {
        /**
         * Re-keys a local routine to the id the server already uses for that
         * day, keeps logs that point at it consistent, and re-enqueues the
         * upsert under the new id. Returns false when there is no such routine.
         */
        async rekeyRoutine(from: string, to: string): Promise<boolean> {
            const tables = [db.routines, db.workoutLogs, db.activeSession, db.outbox];
            const done = await db.transaction("rw", tables, async () => {
                const current = await db.routines.get(from);
                if (!current || from === to) return false;
                const moved: IRoutineTemplate = { ...current, id: to };
                await db.routines.delete(from);
                await db.routines.put(moved);
                const stale = await db.outbox
                    .where("[entity+entityId]")
                    .equals(["routine", from])
                    .first();
                if (stale) await db.outbox.delete(stale.id);
                await enqueueWrite("routine", to, "upsert", moved);

                const logs = await db.workoutLogs.filter((l) => l.templateId === from).toArray();
                for (const l of logs) {
                    await db.workoutLogs.put({ ...l, templateId: to });
                    const pending = await db.outbox
                        .where("[entity+entityId]")
                        .equals(["workoutLog", l.id])
                        .first();
                    if (pending && pending.op === "upsert") {
                        await db.outbox.put({
                            ...pending,
                            payload: { ...(pending.payload as IWorkoutLog), templateId: to },
                        });
                    }
                }
                const sessions = await db.activeSession
                    .filter((r) => r.meta?.templateId === from)
                    .toArray();
                for (const r of sessions) {
                    await db.activeSession.put({
                        ...r,
                        meta: { ...(r.meta as ActiveSessionMeta), templateId: to },
                    });
                }
                return true;
            });
            if (done) notify();
            return done;
        },
        /** Stores server data as-is: no outbox entries, no write notification. */
        async applyPull(data: {
            routines: IRoutineTemplate[];
            customExercises: StoredCustomExercise[];
            logs: IWorkoutLog[];
        }): Promise<void> {
            await db.transaction(
                "rw",
                [db.routines, db.customExercises, db.workoutLogs],
                async () => {
                    await db.routines.bulkPut(data.routines);
                    await db.customExercises.bulkPut(data.customExercises);
                    await db.workoutLogs.bulkPut(data.logs);
                }
            );
        },
        async hasUserData(userId: string): Promise<boolean> {
            const counts = await Promise.all([
                db.routines.where("userId").equals(userId).count(),
                db.customExercises.where("userId").equals(userId).count(),
                db.workoutLogs.where("userId").equals(userId).count(),
            ]);
            return counts.some((n) => n > 0);
        },
        /** Wipes every table. Callers check `canClearLocalData` first. */
        async clearAll(): Promise<void> {
            const all = [
                db.routines,
                db.customExercises,
                db.workoutLogs,
                db.activeSession,
                db.meta,
                db.outbox,
            ];
            await db.transaction("rw", all, async () => {
                await Promise.all(all.map((t) => t.clear()));
            });
        },
    };

    return { routines, customExercises, workoutLogs, activeSession, meta, outbox, sync };
}

export type LocalRepositories = ReturnType<typeof createLocalRepositories>;

/** Lazy singleton for app code. Client-only. */
let shared: LocalRepositories | null = null;
export function getLocalRepositories(): LocalRepositories {
    if (!shared) shared = createLocalRepositories();
    return shared;
}
