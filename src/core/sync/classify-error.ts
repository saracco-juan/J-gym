/**
 * Pure classification of a failed server call into what the engine should do.
 *
 * - auth:            signed out or token problem. Pause, never burn attempts.
 * - network:         unreachable server. Mark offline, never burn attempts.
 * - unique-conflict: a unique constraint (routine day) was hit. Reconcile ids.
 * - missing-parent:  a foreign key (log -> routine) points at nothing.
 * - retry:           anything else. Back off.
 */

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
