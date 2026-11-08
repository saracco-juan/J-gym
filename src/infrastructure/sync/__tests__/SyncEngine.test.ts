import "fake-indexeddb/auto";
import type { IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import type { SyncCommand } from "@/core/sync";
import { JgymDatabase } from "@/infrastructure/local/db";
import { createLocalRepositories, type LocalRepositories } from "@/infrastructure/local/localRepositories";
import { SyncEngine, type SyncState } from "../SyncEngine";
import { SyncTransportError, type SyncTransport } from "../transport";

let db: JgymDatabase;
let repos: LocalRepositories;
let clock: number;
let seq: number;
let dbCount = 0;
let userId: string | null;
let online: boolean;
let timers: { fn: () => void; ms: number; id: number }[];
let timerSeq: number;

class FakeTransport implements SyncTransport {
    commands: SyncCommand[] = [];
    failWith: ((c: SyncCommand) => SyncTransportError | null) | null = null;
    gate: Promise<void> | null = null;
    serverRoutines: unknown[] = [];

    async execute(command: SyncCommand): Promise<void> {
        if (this.gate) await this.gate;
        const err = this.failWith?.(command) ?? null;
        if (err) throw err;
        this.commands.push(command);
    }
    async fetchRoutines(): Promise<unknown[]> {
        return this.serverRoutines;
    }
    async fetchCustomExercises(): Promise<unknown[]> {
        return [];
    }
    async fetchLogsSince(): Promise<unknown[]> {
        return [];
    }
}

let transport: FakeTransport;
let engine: SyncEngine;

function makeEngine(extra: Partial<ConstructorParameters<typeof SyncEngine>[0]> = {}): SyncEngine {
    return new SyncEngine({
        repos,
        transport,
        getUserId: async () => userId,
        now: () => clock,
        random: () => 1,
        isOnline: () => online,
        timers: {
            set: (fn, ms) => {
                const id = ++timerSeq;
                timers.push({ fn, ms, id });
                return id;
            },
            clear: (id) => {
                timers = timers.filter((t) => t.id !== id);
            },
        },
        debounceMs: 1000,
        ...extra,
    });
}

beforeEach(() => {
    clock = 1_000_000;
    seq = 0;
    userId = "u1";
    online = true;
    timers = [];
    timerSeq = 0;
    db = new JgymDatabase(`jgym-engine-${dbCount++}`);
    repos = createLocalRepositories(db, { now: () => clock, newId: () => `id-${++seq}` });
    transport = new FakeTransport();
    engine = makeEngine();
});

afterEach(() => {
    engine.stop();
    db.close();
});

const routine: IRoutineTemplate = { id: "r1", userId: "u1", dayName: "lunes", exercises: [] };
const log: IWorkoutLog = {
    id: "l1",
    userId: "u1",
    templateId: "r1",
    date: "2026-01-05",
    exercises: [],
    completedAt: null,
};

describe("flush", () => {
    it("sends parents first, completes entries and reports idle", async () => {
        await repos.workoutLogs.save(log);
        await repos.routines.save(routine);
        await engine.flush();

        expect(transport.commands.map((c) => c.table)).toEqual(["routine_templates", "workout_logs"]);
        expect(await repos.outbox.count()).toBe(0);
        expect(engine.getState()).toEqual({ status: "idle", pendingCount: 0, lastSyncedAt: clock });
    });

    it("upserts with the session user id and deletes by id", async () => {
        await repos.routines.save({ ...routine, userId: "u1" });
        await repos.routines.save({ ...routine, id: "r2", dayName: "martes" });
        await repos.routines.remove("r2");
        await engine.flush();
        expect(transport.commands).toEqual([
            expect.objectContaining({ kind: "upsert", table: "routine_templates" }),
            { kind: "delete", table: "routine_templates", id: "r2" },
        ]);
    });

    it("pauses while signed out without burning attempts", async () => {
        await repos.routines.save(routine);
        userId = null;
        await engine.flush();
        expect(engine.getState().status).toBe("paused");
        expect(engine.getState().pendingCount).toBe(1);
        expect((await repos.outbox.list())[0].attempts).toBe(0);
        expect(transport.commands).toHaveLength(0);
    });

    it("pauses on auth errors without burning attempts", async () => {
        await repos.routines.save(routine);
        transport.failWith = () => new SyncTransportError("JWT expired", 401);
        await engine.flush();
        expect(engine.getState().status).toBe("paused");
        expect((await repos.outbox.list())[0].attempts).toBe(0);
    });

    it("goes offline on network errors without burning attempts", async () => {
        await repos.routines.save(routine);
        transport.failWith = () => new SyncTransportError("TypeError: Failed to fetch", 0);
        await engine.flush();
        expect(engine.getState().status).toBe("offline");
        expect((await repos.outbox.list())[0].attempts).toBe(0);
    });

    it("does not call the server while the device reports offline", async () => {
        await repos.routines.save(routine);
        online = false;
        await engine.flush();
        expect(engine.getState().status).toBe("offline");
        expect(transport.commands).toHaveLength(0);
    });

    it("backs off other failures using the injected jitter and keeps going", async () => {
        await repos.routines.save(routine);
        await repos.routines.save({ ...routine, id: "r2", dayName: "martes" });
        transport.failWith = (c) =>
            c.kind === "upsert" && c.row.id === "r1" ? new SyncTransportError("boom", 500) : null;
        await engine.flush();

        const entries = await repos.outbox.list();
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ entityId: "r1", attempts: 1, lastError: "boom" });
        expect(entries[0].nextAttemptAt).toBe(clock + 2000);
        expect(engine.getState().status).toBe("error");
        expect(engine.getState().pendingCount).toBe(1);
        // A retry is scheduled for when the entry is due.
        expect(timers.some((t) => t.ms === 2000)).toBe(true);
    });

    it("is single-flight: concurrent flushes do not resend entries", async () => {
        await repos.routines.save(routine);
        let release!: () => void;
        transport.gate = new Promise<void>((r) => {
            release = r;
        });
        const first = engine.flush();
        const second = engine.flush();
        await Promise.resolve();
        release();
        await Promise.all([first, second]);
        expect(transport.commands).toHaveLength(1);
    });

    it("keeps a write made during a flush for the follow-up pass", async () => {
        await repos.routines.save(routine);
        let release!: () => void;
        transport.gate = new Promise<void>((r) => {
            release = r;
        });
        const running = engine.flush();
        await Promise.resolve();
        await repos.routines.save({ ...routine, id: "r2", dayName: "martes" });
        transport.gate = null;
        release();
        await running;
        expect(await repos.outbox.count()).toBe(0);
        expect(transport.commands).toHaveLength(2);
    });
});

describe("conflicts", () => {
    it("re-keys a routine to the server id on a same-day unique violation and retries", async () => {
        await repos.routines.save({ ...routine, id: "local-1" });
        transport.serverRoutines = [{ id: "srv-1", user_id: "u1", day_name: "lunes", exercises: [] }];
        transport.failWith = (c) =>
            c.kind === "upsert" && c.row.id === "local-1"
                ? new SyncTransportError("duplicate key", 409, "23505")
                : null;
        await engine.flush();

        expect(await repos.routines.get("local-1")).toBeUndefined();
        expect(await repos.routines.get("srv-1")).toBeDefined();
        expect(transport.commands).toEqual([
            expect.objectContaining({ kind: "upsert", row: expect.objectContaining({ id: "srv-1" }) }),
        ]);
        expect(await repos.outbox.count()).toBe(0);
    });

    it("falls back to backoff when no server routine explains the unique violation", async () => {
        await repos.routines.save(routine);
        transport.failWith = () => new SyncTransportError("duplicate key", 409, "23505");
        await engine.flush();
        expect((await repos.outbox.list())[0].attempts).toBe(1);
        expect(engine.getState().status).toBe("error");
    });

    it("sends a log detached when its routine is gone from the server", async () => {
        await repos.workoutLogs.save(log);
        let first = true;
        transport.failWith = (c) => {
            if (c.kind === "upsert" && c.table === "workout_logs" && first) {
                first = false;
                return new SyncTransportError("fk", 409, "23503");
            }
            return null;
        };
        await engine.flush();
        expect(transport.commands).toEqual([
            expect.objectContaining({ row: expect.objectContaining({ id: "l1", template_id: null }) }),
        ]);
        expect(await repos.outbox.count()).toBe(0);
    });

    it("does not detach a log while its routine is still pending", async () => {
        await repos.routines.save(routine);
        await repos.workoutLogs.save(log);
        transport.failWith = (c) =>
            c.table === "routine_templates"
                ? new SyncTransportError("boom", 500)
                : new SyncTransportError("fk", 409, "23503");
        await engine.flush();
        expect(transport.commands).toHaveLength(0);
        const entries = await repos.outbox.list();
        expect(entries.map((e) => e.attempts)).toEqual([1, 1]);
    });
});

describe("triggers", () => {
    it("debounces flushes after local writes", async () => {
        engine.notifyLocalWrite();
        engine.notifyLocalWrite();
        expect(timers.filter((t) => t.ms === 1000)).toHaveLength(1);
        await repos.routines.save(routine);
        timers.find((t) => t.ms === 1000)?.fn();
        await new Promise((r) => setTimeout(r, 20));
        expect(transport.commands).toHaveLength(1);
    });

    it("flushes on start, on online and when the page becomes visible", async () => {
        const win = new EventTarget();
        const doc = Object.assign(new EventTarget(), { visibilityState: "hidden" });
        await repos.routines.save(routine);
        engine.start({ window: win, document: doc });
        await new Promise((r) => setTimeout(r, 20));
        expect(transport.commands).toHaveLength(1);

        await repos.routines.save({ ...routine, id: "r2", dayName: "martes" });
        win.dispatchEvent(new Event("online"));
        await new Promise((r) => setTimeout(r, 20));
        expect(transport.commands).toHaveLength(2);

        await repos.routines.save({ ...routine, id: "r3", dayName: "jueves" });
        doc.visibilityState = "visible";
        doc.dispatchEvent(new Event("visibilitychange"));
        await new Promise((r) => setTimeout(r, 20));
        expect(transport.commands).toHaveLength(3);

        await repos.routines.save({ ...routine, id: "r4", dayName: "viernes" });
        doc.visibilityState = "hidden";
        doc.dispatchEvent(new Event("visibilitychange"));
        await new Promise((r) => setTimeout(r, 20));
        expect(transport.commands).toHaveLength(3);
    });

    it("notifies subscribers of state changes", async () => {
        const seen: SyncState["status"][] = [];
        engine.subscribe((s) => seen.push(s.status));
        await repos.routines.save(routine);
        await engine.flush();
        expect(seen).toContain("syncing");
        expect(seen[seen.length - 1]).toBe("idle");
    });
});

describe("initial pull hook", () => {
    it("runs the pull before pushing and reports a failing pull as offline", async () => {
        const order: string[] = [];
        const pull = jest.fn(async () => {
            order.push("pull");
        });
        engine = makeEngine({ pull });
        await repos.routines.save(routine);
        const originalExecute = transport.execute.bind(transport);
        transport.execute = async (c) => {
            order.push("push");
            return originalExecute(c);
        };
        await engine.flush();
        expect(pull).toHaveBeenCalledWith("u1");
        expect(order).toEqual(["pull", "push"]);

        engine = makeEngine({
            pull: async () => {
                throw new SyncTransportError("Failed to fetch", 0);
            },
        });
        await engine.flush();
        expect(engine.getState().status).toBe("offline");
    });
});
