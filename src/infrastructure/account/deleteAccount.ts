/**
 * Deletes the whole account: the server call first, then every trace of the
 * user on this device. Client-only wiring around `performAccountDeletion`.
 *
 * Order matters. If the server call fails nothing local is touched, so the
 * user keeps working and can retry. Once it succeeds the account is gone and
 * the device is wiped no matter what (a failing step never aborts the rest).
 */

import { classifySyncError } from "@/core/sync";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";

export type DeleteAccountResult =
    | { ok: true }
    | { ok: false; reason: "network" | "auth" | "failed" };

export interface RpcError {
    message?: string;
    code?: string;
    status?: number;
}

export interface DeleteAccountDeps {
    /** Calls `delete_own_account()` on the server. */
    callDeleteRpc: () => Promise<{ error: RpcError | null }>;
    /** Wipes every local table (data, outbox, meta, active session, profile, stats). */
    clearLocalData: () => Promise<void>;
    /** Drops the auth session from this device. */
    removeLocalSession: () => Promise<void>;
    /** Runs after the wipe, e.g. to reset in-memory stores. */
    onDeleted?: () => void;
}

export async function performAccountDeletion(deps: DeleteAccountDeps): Promise<DeleteAccountResult> {
    try {
        const { error } = await deps.callDeleteRpc();
        if (error) return { ok: false, reason: reasonFor(error) };
    } catch (thrown) {
        const message = thrown instanceof Error ? thrown.message : String(thrown);
        return { ok: false, reason: reasonFor({ message }) };
    }

    try {
        await deps.clearLocalData();
    } catch {
        // The account is already gone; leaving the screen matters more.
    }
    try {
        await deps.removeLocalSession();
    } catch {
        // Same: never block the exit.
    }
    try {
        deps.onDeleted?.();
    } catch {
        // Cosmetic only.
    }
    return { ok: true };
}

function reasonFor(error: RpcError): "network" | "auth" | "failed" {
    const kind = classifySyncError(error);
    if (kind === "network" || kind === "auth") return kind;
    return "failed";
}

const SIGN_OUT_TIMEOUT_MS = 4000;

/** Rejects when `work` does not settle in time; always clears its timer. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
    });
    return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/** Production wiring. */
export function deleteOwnAccount(onDeleted?: () => void): Promise<DeleteAccountResult> {
    const client = createSupabaseBrowserClient();
    return performAccountDeletion({
        callDeleteRpc: async () => {
            const { error } = await client.rpc("delete_own_account");
            return { error };
        },
        clearLocalData: () => getLocalRepositories().sync.clearAll(),
        // scope "local" drops the session from this device; the user no longer
        // exists on the server, so the timeout keeps a dead network from hanging.
        removeLocalSession: async () => {
            await withTimeout(client.auth.signOut({ scope: "local" }), SIGN_OUT_TIMEOUT_MS);
        },
        onDeleted,
    });
}
