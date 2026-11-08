import "fake-indexeddb/auto";
import type { SyncCommand } from "@/core/sync";
import { JgymDatabase } from "@/infrastructure/local/db";
import { createLocalRepositories, type LocalRepositories } from "@/infrastructure/local/localRepositories";
import { runInitialPull } from "../initialPull";
import type { SyncTransport } from "../transport";

let db: JgymDatabase;
let repos: LocalRepositories;
let dbCount = 0;
const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);

class FakeTransport implements SyncTransport {
    routines: unknown[] = [];
    custom: unknown[] = [];
    logs: unknown[] = [];
    since: string | null = null;
    fetched = 0;
    async execute(command: SyncCommand): Promise<void> {
        void command;
    }
    async fetchRoutines(): Promise<unknown[]> {
        this.fetched++;
        return this.routines;
    }
    async fetchCustomExercises(): Promise<unknown[]> {
        this.fetched++;
        return this.custom;
    }
    async fetchLogsSince(userId: string, since: string): Promise<unknown[]> {
        this.fetched++;
        void userId;
        this.since = since;
        return this.logs;
    }
}

let transport: FakeTransport;

beforeEach(() => {
    db = new JgymDatabase(`jgym-pull-${dbCount++}`);
    repos = createLocalRepositories(db, { now: () => NOW, newId: () => "id" });
    transport = new FakeTransport();
});

afterEach(() => {
    db.close();
});

const serverRoutine = { id: "srv-1", user_id: "u1", day_name: "lunes", exercises: [], schema_version: 2 };
const serverLog = {
    id: "l1",
    user_id: "u1",
    template_id: "srv-1",
    date: "2026-05-30",
    exercises: [],
    completed_at: "2026-05-30T10:00:00.000Z",
};
const serverCustom = {
    id: "c1",
    user_id: "u1",
    name: "Remo",
    muscle_group: "back",
    is_bodyweight: false,
    deleted_at: null,
};

describe("runInitialPull", () => {
    it("fills an empty local database without enqueuing outbox entries", async () => {
        transport.routines = [serverRoutine];
        transport.logs = [serverLog];
        transport.custom = [serverCustom];

        await runInitialPull(repos, transport, "u1", NOW);

        expect(await repos.routines.get("srv-1")).toMatchObject({ dayName: "lunes", userId: "u1" });
        expect(await repos.workoutLogs.get("l1")).toMatchObject({ templateId: "srv-1" });
        expect(await repos.customExercises.get("c1")).toMatchObject({ name: "Remo", userId: "u1" });
        expect(await repos.outbox.count()).toBe(0);
        expect(await repos.meta.get("lastPulledAt:u1")).toBe(NOW);
        expect(transport.since).toBe("2026-02-01");
    });

    it("does nothing once the user was pulled", async () => {
        await repos.meta.set("lastPulledAt:u1", 5);
        await runInitialPull(repos, transport, "u1", NOW);
        expect(transport.fetched).toBe(0);
        expect(await repos.meta.get("lastPulledAt:u1")).toBe(5);
    });

    it("never overwrites existing local data, only re-keys same-day routines", async () => {
        await repos.routines.save({ id: "local-1", userId: "u1", dayName: "lunes", exercises: [] });
        transport.routines = [serverRoutine];
        transport.logs = [serverLog];

        await runInitialPull(repos, transport, "u1", NOW);

        expect(await repos.routines.get("local-1")).toBeUndefined();
        expect(await repos.routines.get("srv-1")).toBeDefined();
        expect(await repos.workoutLogs.get("l1")).toBeUndefined();
        expect(await repos.meta.get("lastPulledAt:u1")).toBe(NOW);
    });

    it("leaves the flag unset when the server cannot be reached", async () => {
        transport.fetchRoutines = async () => {
            throw new Error("offline");
        };
        await expect(runInitialPull(repos, transport, "u1", NOW)).rejects.toThrow("offline");
        expect(await repos.meta.get("lastPulledAt:u1")).toBeUndefined();
    });
});
