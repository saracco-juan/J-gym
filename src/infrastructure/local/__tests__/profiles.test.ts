import "fake-indexeddb/auto";
import type { IProfile } from "@/core/domain";
import { JgymDatabase } from "../db";
import { createLocalRepositories, type LocalRepositories } from "../localRepositories";

let db: JgymDatabase;
let repos: LocalRepositories;
let notifications = 0;
let seq = 0;
let dbCount = 0;

beforeEach(() => {
    notifications = 0;
    seq = 0;
    db = new JgymDatabase(`jgym-profiles-${dbCount++}`);
    repos = createLocalRepositories(db, {
        now: () => 1000,
        newId: () => `id-${++seq}`,
        onWrite: () => {
            notifications++;
        },
    });
});

afterEach(() => {
    db.close();
});

const profile: IProfile = { userId: "u1", displayName: "Juan", avatarColor: "#2563eb" };

describe("profiles", () => {
    it("saves the profile and enqueues an upsert keyed by the user id", async () => {
        await repos.profiles.save(profile);

        expect(await repos.profiles.get("u1")).toEqual(profile);
        const entries = await repos.outbox.list();
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            entity: "profile",
            entityId: "u1",
            op: "upsert",
            payload: profile,
        });
    });

    it("coalesces repeated edits into one pending write and notifies the sync engine", async () => {
        await repos.profiles.save(profile);
        await repos.profiles.save({ ...profile, displayName: "Juana" });

        const entries = await repos.outbox.list();
        expect(entries).toHaveLength(1);
        expect(entries[0].payload).toMatchObject({ displayName: "Juana" });
        expect(notifications).toBe(2);
    });

    it("returns undefined for a user without a profile", async () => {
        expect(await repos.profiles.get("nobody")).toBeUndefined();
    });

    it("clears a previous rejection when the profile is saved again", async () => {
        await repos.profiles.save(profile);
        const [entry] = await repos.outbox.list();
        await repos.sync.rejectProfileWrite(entry);
        expect(await repos.profiles.getRejection("u1")).toEqual({
            displayName: "Juan",
            reason: "name-taken",
        });

        await repos.profiles.save({ ...profile, displayName: "Juana" });
        expect(await repos.profiles.getRejection("u1")).toBeUndefined();
    });
});

describe("storeProfileIfAbsent", () => {
    it("stores a server profile without an outbox entry or a write notification", async () => {
        expect(await repos.sync.storeProfileIfAbsent(profile)).toBe(true);
        expect(await repos.profiles.get("u1")).toEqual(profile);
        expect(await repos.outbox.count()).toBe(0);
        expect(notifications).toBe(0);
    });

    it("keeps an existing local profile", async () => {
        await repos.profiles.save({ ...profile, displayName: "Local" });
        expect(await repos.sync.storeProfileIfAbsent(profile)).toBe(false);
        expect((await repos.profiles.get("u1"))?.displayName).toBe("Local");
    });

    it("keeps a profile that is still waiting in the outbox", async () => {
        await repos.profiles.save(profile);
        await db.profiles.clear();
        expect(await repos.sync.storeProfileIfAbsent({ ...profile, displayName: "Server" })).toBe(false);
        expect(await repos.profiles.get("u1")).toBeUndefined();
    });
});

describe("clearAll", () => {
    it("also wipes the profile", async () => {
        await repos.profiles.save(profile);
        await repos.sync.clearAll();
        expect(await repos.profiles.get("u1")).toBeUndefined();
    });
});
