/**
 * Browser wiring of the sync engine: the real transport, the offline-safe
 * user id lookup and sign-out handling. Client-only.
 */

import { canClearLocalData, resolveUserId } from "@/core/sync";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { runInitialPull } from "./initialPull";
import { SyncEngine } from "./SyncEngine";
import { createSupabaseTransport } from "./supabaseTransport";

const LAST_USER_KEY = "lastUserId";

/**
 * Session user id without touching the network: `getSession()` reads local
 * storage, unlike `getUser()`. While offline with no readable session the
 * last known user keeps cached data reachable.
 */
export async function resolveLocalUserId(): Promise<string | null> {
    const repos = getLocalRepositories();
    let sessionUserId: string | null = null;
    try {
        const { data } = await createSupabaseBrowserClient().auth.getSession();
        sessionUserId = data.session?.user.id ?? null;
    } catch {
        sessionUserId = null;
    }
    const cachedUserId = (await repos.meta.get<string>(LAST_USER_KEY)) ?? null;
    if (sessionUserId && sessionUserId !== cachedUserId) {
        await repos.meta.set(LAST_USER_KEY, sessionUserId);
    }
    return resolveUserId({
        sessionUserId,
        cachedUserId,
        online: typeof navigator === "undefined" ? true : navigator.onLine,
    });
}

let engine: SyncEngine | null = null;

export function getSyncEngine(): SyncEngine {
    if (!engine) {
        const repos = getLocalRepositories();
        const transport = createSupabaseTransport(createSupabaseBrowserClient());
        engine = new SyncEngine({
            repos,
            transport,
            getUserId: resolveLocalUserId,
            now: () => Date.now(),
            random: Math.random,
            isOnline: () => navigator.onLine,
            pull: (userId) => runInitialPull(repos, transport, userId, Date.now()),
        });
    }
    return engine;
}

/**
 * Signs out. Tries a last flush first; local data is wiped afterwards only
 * when the outbox is empty (otherwise unsynced work would be lost, so it is
 * kept on the device and syncs after the next sign-in of the same user).
 */
export async function signOutAndClear(): Promise<{ cleared: boolean }> {
    const repos = getLocalRepositories();
    try {
        await Promise.race([getSyncEngine().flush(), new Promise((r) => setTimeout(r, 5000))]);
    } catch {
        // Best effort: signing out must not depend on the network.
    }
    await createSupabaseBrowserClient().auth.signOut();
    if (canClearLocalData(await repos.outbox.count())) {
        await repos.sync.clearAll();
        return { cleared: true };
    }
    return { cleared: false };
}
