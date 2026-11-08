/**
 * SyncEngine: flushes the local outbox to the server. The phone (IndexedDB)
 * is the source of truth; the server is a backup. Single device, last write
 * wins, so every send is an idempotent upsert keyed by the client UUID.
 *
 * Triggers: start, `online`, `visibilitychange` to visible, and shortly
 * after a local write (debounced). Flushes are single-flight.
 *
 * What to do with entries and errors is decided by pure functions in
 * `@/core/sync`; this class only does the I/O around them.
 *
 * Errors:
 * - auth / signed out -> "paused": entries are left untouched (attempts are
 *   not burned while the user cannot authenticate).
 * - network / offline -> "offline": same, nothing is burned.
 * - routine unique violation -> reconcile ids with the server and retry.
 * - anything else -> exponential backoff via `fail` (jitter from the
 *   injected `random`, which is Math.random at the app edge).
 */

import {
    classifySyncError,
    detachTemplate,
    planFlush,
    toSyncCommand,
    type SyncCommand,
    type SyncErrorInfo,
} from "@/core/sync";
import type { OutboxEntry } from "@/core/sync";
import { subscribeLocalWrites, type LocalRepositories } from "@/infrastructure/local/localRepositories";
import { reconcileRoutines } from "./reconcile";
import { SyncTransportError, type SyncTransport } from "./transport";

export type SyncStatus = "idle" | "syncing" | "offline" | "error" | "paused";

export interface SyncState {
    status: SyncStatus;
    pendingCount: number;
    lastSyncedAt: number | null;
}

export interface SyncTimers {
    set: (fn: () => void, ms: number) => unknown;
    clear: (handle: unknown) => void;
}

export interface SyncEnv {
    window: Pick<EventTarget, "addEventListener" | "removeEventListener">;
    document: Pick<EventTarget, "addEventListener" | "removeEventListener"> & {
        visibilityState: string;
    };
}

export interface SyncEngineDeps {
    repos: LocalRepositories;
    transport: SyncTransport;
    /** Session user id (from local storage, works offline) or null. */
    getUserId: () => Promise<string | null>;
    now: () => number;
    /** In [0, 1]. Injected so backoff jitter stays testable. */
    random: () => number;
    isOnline?: () => boolean;
    timers?: SyncTimers;
    /** Delay between a local write and the flush it triggers. */
    debounceMs?: number;
    /** Runs once per user before the first push (initial pull). */
    pull?: (userId: string) => Promise<void>;
}

const MAX_PASSES = 20;

const defaultTimers: SyncTimers = {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

function errorInfo(error: unknown): SyncErrorInfo {
    if (error instanceof SyncTransportError) {
        return { status: error.status, code: error.code, message: error.message };
    }
    return { message: error instanceof Error ? error.message : String(error) };
}

type PassResult = "done" | "offline" | "paused" | "rerun";

export class SyncEngine {
    private state: SyncState = { status: "idle", pendingCount: 0, lastSyncedAt: null };
    private listeners = new Set<(state: SyncState) => void>();
    private running: Promise<void> | null = null;
    private rerun = false;
    private debounceHandle: unknown = null;
    private retryHandle: unknown = null;
    private teardown: (() => void) | null = null;
    private readonly timers: SyncTimers;
    private readonly debounceMs: number;

    constructor(private readonly deps: SyncEngineDeps) {
        this.timers = deps.timers ?? defaultTimers;
        this.debounceMs = deps.debounceMs ?? 1500;
    }

    getState(): SyncState {
        return this.state;
    }

    subscribe(listener: (state: SyncState) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /** Attaches the triggers and runs a first flush. Idempotent. */
    start(env: SyncEnv): void {
        if (this.teardown) return;
        const onOnline = () => void this.flush();
        const onOffline = () => this.setState({ status: "offline" });
        const onVisibility = () => {
            if (env.document.visibilityState === "visible") void this.flush();
        };
        env.window.addEventListener("online", onOnline);
        env.window.addEventListener("offline", onOffline);
        env.document.addEventListener("visibilitychange", onVisibility);
        const unsubscribe = subscribeLocalWrites(() => this.notifyLocalWrite());
        this.teardown = () => {
            env.window.removeEventListener("online", onOnline);
            env.window.removeEventListener("offline", onOffline);
            env.document.removeEventListener("visibilitychange", onVisibility);
            unsubscribe();
        };
        void this.flush();
    }

    stop(): void {
        this.teardown?.();
        this.teardown = null;
        if (this.debounceHandle !== null) this.timers.clear(this.debounceHandle);
        if (this.retryHandle !== null) this.timers.clear(this.retryHandle);
        this.debounceHandle = null;
        this.retryHandle = null;
    }

    /** Call after a local write: refreshes the pending count, schedules a flush. */
    notifyLocalWrite(): void {
        void this.refreshPending();
        if (this.debounceHandle !== null) this.timers.clear(this.debounceHandle);
        this.debounceHandle = this.timers.set(() => {
            this.debounceHandle = null;
            void this.flush();
        }, this.debounceMs);
    }

    /** Single-flight: a call during a flush asks for one more pass and joins it. */
    flush(): Promise<void> {
        if (this.running) {
            this.rerun = true;
            return this.running;
        }
        this.running = this.runFlush().finally(() => {
            this.running = null;
        });
        return this.running;
    }

    // --- internals ---------------------------------------------------

    private setState(patch: Partial<SyncState>): void {
        this.state = { ...this.state, ...patch };
        this.listeners.forEach((fn) => fn(this.state));
    }

    private async refreshPending(): Promise<void> {
        const pendingCount = await this.deps.repos.outbox.count();
        if (pendingCount !== this.state.pendingCount) this.setState({ pendingCount });
    }

    private async runFlush(): Promise<void> {
        const { repos } = this.deps;
        if (this.retryHandle !== null) {
            this.timers.clear(this.retryHandle);
            this.retryHandle = null;
        }
        this.setState({ status: "syncing", pendingCount: await repos.outbox.count() });

        if (this.deps.isOnline && !this.deps.isOnline()) {
            this.setState({ status: "offline" });
            return;
        }

        const userId = await this.deps.getUserId();
        const initial = planFlush({ entries: [], now: this.deps.now(), userId });
        if (initial.kind === "paused") {
            this.setState({ status: "paused", pendingCount: await repos.outbox.count() });
            return;
        }

        let failures = 0;
        let outcome: PassResult = "done";
        try {
            if (this.deps.pull && userId) await this.deps.pull(userId);
            for (let pass = 0; pass < MAX_PASSES; pass++) {
                this.rerun = false;
                const result = await this.pass(userId as string, () => failures++);
                if (result === "offline" || result === "paused") {
                    outcome = result;
                    break;
                }
                if (result === "done" && !this.rerun && !(await this.hasDueWork(userId as string))) {
                    break;
                }
            }
        } catch (error) {
            const kind = classifySyncError(errorInfo(error));
            outcome = kind === "auth" ? "paused" : kind === "network" ? "offline" : "done";
            if (outcome === "done") failures++;
        }

        const pendingCount = await repos.outbox.count();
        if (outcome === "offline") this.setState({ status: "offline", pendingCount });
        else if (outcome === "paused") this.setState({ status: "paused", pendingCount });
        else if (failures > 0 || pendingCount > 0) {
            this.setState({ status: failures > 0 ? "error" : "idle", pendingCount });
            await this.scheduleRetry();
        } else {
            this.setState({ status: "idle", pendingCount, lastSyncedAt: this.deps.now() });
        }
    }

    /** One pass over the currently due entries. */
    private async pass(userId: string, onFailure: () => void): Promise<PassResult> {
        const { repos } = this.deps;
        const now = this.deps.now();
        const plan = planFlush({ entries: await repos.outbox.list(), now, userId });
        if (plan.kind === "paused") return "paused";

        let reconciled = false;
        for (const entry of plan.batch) {
            const command = toSyncCommand(entry, userId, new Date(now).toISOString());
            try {
                await this.deps.transport.execute(command);
                await repos.outbox.complete(entry.id);
                continue;
            } catch (error) {
                const info = errorInfo(error);
                const kind = classifySyncError(info);

                if (kind === "auth") return "paused";
                if (kind === "network") return "offline";

                if (kind === "unique-conflict" && entry.entity === "routine" && !reconciled) {
                    reconciled = true;
                    if ((await reconcileRoutines(repos, this.deps.transport, userId)) > 0) {
                        // The entry now lives under the server id: replan.
                        return "rerun";
                    }
                }

                if (kind === "missing-parent" && (await this.sendDetached(entry, command))) {
                    continue;
                }

                await repos.outbox.fail(
                    entry.id,
                    info.message ?? "Unknown error",
                    this.deps.now(),
                    this.deps.random()
                );
                onFailure();
            }
        }
        return "done";
    }

    /**
     * A log whose routine is missing on the server is sent without it, unless
     * that routine is still waiting in the outbox (then it should just retry).
     */
    private async sendDetached(entry: OutboxEntry, command: SyncCommand): Promise<boolean> {
        const detached = detachTemplate(command);
        if (!detached || entry.entity !== "workoutLog") return false;
        const templateId = (entry.payload as { templateId?: string }).templateId;
        const pending = await this.deps.repos.outbox.list();
        if (pending.some((e) => e.entity === "routine" && e.entityId === templateId)) return false;
        try {
            await this.deps.transport.execute(detached);
            await this.deps.repos.outbox.complete(entry.id);
            return true;
        } catch {
            return false;
        }
    }

    /** True when writes arrived (or became due) while a pass was running. */
    private async hasDueWork(userId: string): Promise<boolean> {
        const plan = planFlush({
            entries: await this.deps.repos.outbox.list(),
            now: this.deps.now(),
            userId,
        });
        return plan.kind === "send" && plan.batch.length > 0;
    }

    private async scheduleRetry(): Promise<void> {
        const entries = await this.deps.repos.outbox.list();
        if (entries.length === 0) return;
        const next = Math.min(...entries.map((e) => e.nextAttemptAt));
        const delay = Math.max(0, next - this.deps.now());
        this.retryHandle = this.timers.set(() => {
            this.retryHandle = null;
            void this.flush();
        }, delay);
    }
}
