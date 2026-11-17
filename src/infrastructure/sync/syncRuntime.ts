/**
 * Browser wiring of the sync engine: the real transport, the offline-safe
 * user id lookup and sign-out handling. Client-only.
 */

import { canClearLocalData, resolveUserId } from "@/core/sync";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { lastPulledKey, pullOwnProfile, runInitialPull } from "./initialPull";
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

const FLUSH_TIMEOUT_MS = 5000;
const SIGN_OUT_TIMEOUT_MS = 4000;

/** Rejects when `work` does not settle in time; always clears its timer. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
    });
    return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Removes the auth session, whatever the network does. The server call can
 * throw, return an error or hang while offline, and in those cases the
 * session would stay in storage; `scope: "local"` only drops it from this
 * device and needs no network. Never throws.
 */
async function removeSession(): Promise<void> {
    const auth = createSupabaseBrowserClient().auth;
    try {
        const { error } = await withTimeout(auth.signOut(), SIGN_OUT_TIMEOUT_MS);
        if (!error) return;
    } catch {
        // Fall through to the local sign-out.
    }
    try {
        await auth.signOut({ scope: "local" });
    } catch {
        // Nothing else can be done; the caller still leaves the screen.
    }
}

/**
 * Signs out. Tries a last flush first (best effort, bounded); local data is
 * wiped afterwards only when the outbox is empty (otherwise unsynced work
 * would be lost, so it is kept on the device and syncs after the next sign-in
 * of the same user). Never throws.
 */
export async function signOutAndClear(): Promise<{ cleared: boolean }> {
    const repos = getLocalRepositories();
    try {
        await withTimeout(getSyncEngine().flush(), FLUSH_TIMEOUT_MS);
    } catch {
        // Best effort: signing out must not depend on the network.
    }
    await removeSession();
    try {
        if (canClearLocalData(await repos.outbox.count())) {
            await repos.sync.clearAll();
            return { cleared: true };
        }
    } catch {
        // Local data stays; the session is already gone.
    }
    return { cleared: false };
}

/**
 * Resolves once the first server pull for this user had its chance to run.
 * Used before concluding "no routines, go to onboarding" on a fresh device.
 * Offline it returns immediately: there is nothing to wait for.
 */
export async function waitForFirstPull(userId: string): Promise<void> {
    const repos = getLocalRepositories();
    if ((await repos.meta.get(lastPulledKey(userId))) !== undefined) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
        await getSyncEngine().flush();
    } catch {
        // Best effort: the dashboard decides with whatever is local.
    }
}

/**
 * Looks for the own profile on the server when the device has none (another
 * device may have created it). Best effort and online only: returns whether
 * a profile is now stored locally.
 */
export async function refreshOwnProfile(userId: string): Promise<boolean> {
    const repos = getLocalRepositories();
    if (await repos.profiles.get(userId)) return true;
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;
    try {
        const transport = createSupabaseTransport(createSupabaseBrowserClient());
        await pullOwnProfile(repos, transport, userId);
    } catch {
        // Best effort: the caller decides with whatever is local.
    }
    return (await repos.profiles.get(userId)) !== undefined;
}
