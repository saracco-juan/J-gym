/**
 * Pure classification of a failed server call into what the engine should do.
 *
 * - auth:            signed out or token problem. Pause, never burn attempts.
 * - network:         unreachable server. Mark offline, never burn attempts.
 * - unique-conflict: a unique constraint (routine day) was hit. Reconcile ids.
 * - missing-parent:  a foreign key (log -> routine) points at nothing.
 * - retry:           anything else. Back off.
 */

import type { OutboxEntity } from "./outbox";

export type SyncErrorKind = "auth" | "network" | "unique-conflict" | "missing-parent" | "retry";

export interface SyncErrorInfo {
    status?: number;
    code?: string;
    message?: string;
}

const AUTH_CODES = new Set(["PGRST301", "PGRST302", "42501"]);
const AUTH_MESSAGE = /jwt|not authenticated|invalid claim/i;
const NETWORK_MESSAGE =
    /failed to fetch|network ?error|load failed|fetch failed|network request failed/i;

export function classifySyncError(info: SyncErrorInfo): SyncErrorKind {
    const { status, code, message } = info;
    if (status === 401 || status === 403) return "auth";
    if (code !== undefined && AUTH_CODES.has(code)) return "auth";
    if (message !== undefined && AUTH_MESSAGE.test(message)) return "auth";
    if (code === "23505") return "unique-conflict";
    if (code === "23503") return "missing-parent";
    if (status === 0) return "network";
    if (!code && message !== undefined && NETWORK_MESSAGE.test(message)) return "network";
    return "retry";
}

/**
 * A failed public stats snapshot is dropped instead of retried, unless the
 * device is simply offline. The snapshot is derived data that is recomputed
 * and enqueued again on the next trigger, and its failures (the server has no
 * profile for the user yet, or the table is missing) must never pause the
 * queue or burn attempts that belong to the user's own data.
 */
export function shouldDropFailedEntry(entity: OutboxEntity, kind: SyncErrorKind): boolean {
    return entity === "stats" && kind !== "network";
}
