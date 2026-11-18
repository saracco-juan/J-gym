import "fake-indexeddb/auto";
import type { SyncCommand } from "@/core/sync";
import { JgymDatabase } from "@/infrastructure/local/db";
import { createLocalRepositories, type LocalRepositories } from "@/infrastructure/local/localRepositories";
import { pullOwnProfile, runInitialPull } from "../initialPull";
import { SyncTransportError, type SyncTransport } from "../transport";

let db: JgymDatabase;
let repos: LocalRepositories;
let dbCount = 0;
const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);

class FakeTransport implements SyncTransport {
    routines: unknown[] = [];
    custom: unknown[] = [];
    logs: unknown[] = [];
    overrides: unknown[] = [];
    overridesError: Error | null = null;
    overridesSince: string | null = null;
    profile: unknown | null = null;
    profileError: Error | null = null;
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
    async fetchDayOverridesSince(userId: string, since: string): Promise<unknown[]> {
        this.fetched++;
        void userId;
        this.overridesSince = since;
        if (this.overridesError) throw this.overridesError;
        return this.overrides;
    }
    async fetchProfile(): Promise<unknown | null> {
        this.fetched++;
        if (this.profileError) throw this.profileError;
        return this.profile;
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

    it("pulls the swapped days of the same window without outbox entries", async () => {
        transport.routines = [serverRoutine];
        transport.overrides = [
            { user_id: "u1", date: "2026-05-29", day_name: "lunes", schema_version: 1 },
            { user_id: "u1", date: "2026-05-25", day_name: "viernes", schema_version: 1 },
        ];

        await runInitialPull(repos, transport, "u1", NOW);

        expect(transport.overridesSince).toBe("2026-02-01");
        expect(await repos.dayOverrides.listByUser("u1")).toEqual([
            { userId: "u1", date: "2026-05-25", dayName: "viernes" },
            { userId: "u1", date: "2026-05-29", dayName: "lunes" },
        ]);
        expect(await repos.outbox.count()).toBe(0);
    });

    it("still completes the pull when the server has no day_overrides table", async () => {
        transport.routines = [serverRoutine];
        transport.overridesError = new SyncTransportError("relation does not exist", 404, "42P01");

        await runInitialPull(repos, transport, "u1", NOW);

        expect(await repos.routines.get("srv-1")).toBeDefined();
        expect(await repos.dayOverrides.listByUser("u1")).toEqual([]);
        expect(await repos.meta.get("lastPulledAt:u1")).toBe(NOW);
    });

    it("retries later when the swapped days cannot be reached", async () => {
        transport.overridesError = new SyncTransportError("offline", 0);
        await expect(runInitialPull(repos, transport, "u1", NOW)).rejects.toThrow("offline");
        expect(await repos.meta.get("lastPulledAt:u1")).toBeUndefined();
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

    it("also pulls the own profile into an empty local database, without an outbox entry", async () => {
        transport.profile = { user_id: "u1", display_name: "Juan", avatar_color: "#2563eb" };
        await runInitialPull(repos, transport, "u1", NOW);
        expect(await repos.profiles.get("u1")).toEqual({
            userId: "u1",
            displayName: "Juan",
            avatarColor: "#2563eb",
        });
        expect(await repos.outbox.count()).toBe(0);
    });

    it("pulls the own profile even when local data already exists", async () => {
        await repos.routines.save({ id: "local-1", userId: "u1", dayName: "lunes", exercises: [] });
        transport.profile = { user_id: "u1", display_name: "Juan", avatar_color: "#2563eb" };
        await runInitialPull(repos, transport, "u1", NOW);
        expect(await repos.profiles.get("u1")).toMatchObject({ displayName: "Juan" });
    });

    it("leaves the flag unset when the server cannot be reached", async () => {
        transport.fetchRoutines = async () => {
            throw new Error("offline");
        };
        await expect(runInitialPull(repos, transport, "u1", NOW)).rejects.toThrow("offline");
        expect(await repos.meta.get("lastPulledAt:u1")).toBeUndefined();
    });
});

describe("pullOwnProfile", () => {
    const serverProfile = { user_id: "u1", display_name: "Juan", avatar_color: "#2563eb" };

    it("stores the server profile when there is none locally", async () => {
        transport.profile = serverProfile;
        await pullOwnProfile(repos, transport, "u1");
        expect(await repos.profiles.get("u1")).toMatchObject({ displayName: "Juan" });
    });

    it("does nothing when the server has no profile", async () => {
        await pullOwnProfile(repos, transport, "u1");
        expect(await repos.profiles.get("u1")).toBeUndefined();
    });

    it("never overwrites a local profile", async () => {
        await repos.profiles.save({ userId: "u1", displayName: "Local", avatarColor: "#059669" });
        transport.profile = serverProfile;
        await pullOwnProfile(repos, transport, "u1");
        expect(await repos.profiles.get("u1")).toMatchObject({ displayName: "Local" });
    });

    it("ignores a server that has no profiles table yet", async () => {
        transport.profileError = new SyncTransportError("relation missing", 404, "PGRST205");
        await expect(pullOwnProfile(repos, transport, "u1")).resolves.toBeUndefined();
    });

    it("rethrows connectivity problems so the pull is retried", async () => {
        transport.profileError = new SyncTransportError("Failed to fetch", 0);
        await expect(pullOwnProfile(repos, transport, "u1")).rejects.toThrow("Failed to fetch");
    });
});
