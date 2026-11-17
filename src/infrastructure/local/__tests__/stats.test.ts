import "fake-indexeddb/auto";
import { computeUserStats } from "@/core/stats";
import { JgymDatabase } from "../db";
import { createLocalRepositories, statsSnapshotKey, type LocalRepositories } from "../localRepositories";

let db: JgymDatabase;
let repos: LocalRepositories;
let notifications = 0;
let seq = 0;
let dbCount = 0;

beforeEach(() => {
    notifications = 0;
    seq = 0;
    db = new JgymDatabase(`jgym-stats-${dbCount++}`);
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

const stats = computeUserStats({ templates: [], logs: [], today: "2026-11-17" });

describe("stats snapshot", () => {
    it("is undefined until something was published", async () => {
        expect(await repos.stats.get("u1")).toBeUndefined();
    });

    it("stores the snapshot with the day it was computed for and enqueues an upsert", async () => {
        await repos.stats.publish("u1", "2026-11-17", stats);

        expect(await repos.stats.get("u1")).toEqual({ date: "2026-11-17", stats });
        expect((await db.meta.get(statsSnapshotKey("u1")))?.key).toBe("statsSnapshot:u1");
        const entries = await repos.outbox.list();
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            entity: "stats",
            entityId: "u1",
            op: "upsert",
            payload: { userId: "u1", stats },
        });
        expect(notifications).toBe(1);
    });

    it("coalesces repeated publishes into the latest one", async () => {
        await repos.stats.publish("u1", "2026-11-16", stats);
        await repos.stats.publish("u1", "2026-11-17", { ...stats, streak: 7 });

        const entries = await repos.outbox.list();
        expect(entries).toHaveLength(1);
        expect(entries[0].payload).toMatchObject({ stats: { streak: 7 } });
        expect((await repos.stats.get("u1"))?.date).toBe("2026-11-17");
    });

    it("keeps each user apart", async () => {
        await repos.stats.publish("u1", "2026-11-17", stats);
        expect(await repos.stats.get("u2")).toBeUndefined();
    });

    it("is wiped with the rest of the local data", async () => {
        await repos.stats.publish("u1", "2026-11-17", stats);
        await repos.sync.clearAll();
        expect(await repos.stats.get("u1")).toBeUndefined();
    });
});
