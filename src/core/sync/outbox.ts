/**
 * Outbox: pure logic for the local write queue that the sync engine flushes
 * to the server. No I/O, no clock, no randomness: `now`, ids and jitter are
 * always injected so everything is deterministic.
 */

export type OutboxEntity = "routine" | "customExercise" | "workoutLog";
export type OutboxOp = "upsert" | "delete";

export interface OutboxEntry {
    id: string;
    entity: OutboxEntity;
    entityId: string;
    op: OutboxOp;
    payload: unknown;
    /** Epoch ms of the first pending write for this entity. */
    createdAt: number;
    attempts: number;
    /** Epoch ms from which the entry may be sent. */
    nextAttemptAt: number;
    lastError?: string;
}

export interface EnqueueInput {
    /** Fresh id for the (possibly coalesced) entry. */
    id: string;
    entity: OutboxEntity;
    entityId: string;
    op: OutboxOp;
    payload: unknown;
    now: number;
}

/** Parents first: routines, then custom exercises, then logs. */
export const ENTITY_PRIORITY: Readonly<Record<OutboxEntity, number>> = {
    routine: 0,
    customExercise: 1,
    workoutLog: 2,
};

export const BACKOFF_BASE_MS = 2_000;
export const BACKOFF_CAP_MS = 5 * 60_000;

/**
 * Builds the entry to store for a write, given the pending entry for the same
 * entity+entityId (if any). A newer write replaces the pending one (a delete
 * supersedes a pending upsert); the original `createdAt` is kept, and the
 * entry gets the new id so that a flush already in flight for the old id
 * cannot acknowledge (and drop) the newer payload.
 */
export function coalesceEntry(existing: OutboxEntry | undefined, input: EnqueueInput): OutboxEntry {
    return {
        id: input.id,
        entity: input.entity,
        entityId: input.entityId,
        op: input.op,
        payload: input.payload,
        createdAt: existing ? existing.createdAt : input.now,
        attempts: 0,
        nextAttemptAt: input.now,
    };
}

/** Returns a new list with the write enqueued (coalesced). */
export function enqueue(entries: readonly OutboxEntry[], input: EnqueueInput): OutboxEntry[] {
    const existing = entries.find(
        (e) => e.entity === input.entity && e.entityId === input.entityId
    );
    const next = coalesceEntry(existing, input);
    return [...entries.filter((e) => e !== existing), next];
}

/** Due entries (nextAttemptAt <= now) by entity priority, then createdAt. */
export function nextBatch(entries: readonly OutboxEntry[], now: number): OutboxEntry[] {
    return entries
        .filter((e) => e.nextAttemptAt <= now)
        .sort(
            (a, b) =>
                ENTITY_PRIORITY[a.entity] - ENTITY_PRIORITY[b.entity] ||
                a.createdAt - b.createdAt
        );
}

/**
 * Exponential backoff: base * 2^(attempts-1), capped. `jitter` in [0, 1]
 * scales the delay into [50%, 100%] of that value (jitter 1 = full delay).
 */
export function markFailed(
    entry: OutboxEntry,
    error: string,
    now: number,
    jitter: number
): OutboxEntry {
    const attempts = entry.attempts + 1;
    const raw = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (attempts - 1));
    const j = Math.min(1, Math.max(0, jitter));
    const delay = Math.round(raw * (0.5 + 0.5 * j));
    return { ...entry, attempts, lastError: error, nextAttemptAt: now + delay };
}

/** Removes an acknowledged entry (matched by id). */
export function markSucceeded(entries: readonly OutboxEntry[], id: string): OutboxEntry[] {
    return entries.filter((e) => e.id !== id);
}
