import "fake-indexeddb/auto";
import type { IProfile, IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import { JgymDatabase } from "@/infrastructure/local/db";
import { createLocalRepositories, type LocalRepositories } from "@/infrastructure/local/localRepositories";
import { publishOwnStats } from "../publishStats";

let db: JgymDatabase;
let repos: LocalRepositories;
let dbCount = 0;

beforeEach(() => {
    db = new JgymDatabase(`jgym-publish-${dbCount++}`);
    let seq = 0;
    repos = createLocalRepositories(db, { now: () => 1000, newId: () => `id-${++seq}` });
});

afterEach(() => {
    db.close();
});

const profile: IProfile = { userId: "u1", displayName: "Juan", avatarColor: "#2563eb" };

const monday: IRoutineTemplate = {
    id: "r1",
    userId: "u1",
    dayName: "lunes",
    exercises: [
        {
            exercise: { id: "e1", name: "Press banca" },
            ref: { source: "catalog", id: "bench-press" },
            sets: [{ setNumber: 1, targetReps: 8, targetWeight: 0 }],
        },
    ],
};

const trained: IWorkoutLog = {
    id: "l1",
    userId: "u1",
    templateId: "r1",
    date: "2026-11-16", // Monday
    exercises: [
        {
            exercise: { id: "e1", name: "Press banca" },
            ref: { source: "catalog", id: "bench-press" },
            status: "completed",
            sets: [
                { setNumber: 1, actualReps: 8, actualWeight: 60 },
                { setNumber: 2, actualReps: 8, actualWeight: 60 },
            ],
        },
    ],
    completedAt: null,
};

async function seed(): Promise<void> {
    await repos.sync.storeProfileIfAbsent(profile);
    await db.routines.put(monday);
    await db.workoutLogs.put(trained);
}

describe("publishOwnStats", () => {
    it("computes the snapshot from the local data and enqueues it", async () => {
        await seed();
        const result = await publishOwnStats(repos, { userId: "u1", today: "2026-11-17", registered: true });

        expect(result).toBe("published");
        const stored = await repos.stats.get("u1");
        expect(stored?.date).toBe("2026-11-17");
        expect(stored?.stats).toMatchObject({
            streak: 1,
            xp: 20,
            workoutsCount: 1,
            weeklyVolumeKg: 960,
            weekStart: "2026-11-16",
        });
        expect(await repos.outbox.count()).toBe(1);
    });

    it("reads the streak through the swapped days", async () => {
        // Monday's routine moved to Tuesday the 17th and was trained there.
        await repos.sync.storeProfileIfAbsent(profile);
        await db.routines.put(monday);
        await db.workoutLogs.put({ ...trained, date: "2026-11-17" });
        await repos.dayOverrides.replaceWeek("u1", ["2026-11-16", "2026-11-17"], {
            "2026-11-16": "martes",
            "2026-11-17": "lunes",
        });
        await publishOwnStats(repos, { userId: "u1", today: "2026-11-17", registered: true });
        expect((await repos.stats.get("u1"))?.stats.streak).toBe(1);
    });

    it("never publishes for an anonymous account", async () => {
        await seed();
        const result = await publishOwnStats(repos, { userId: "u1", today: "2026-11-17", registered: false });
        expect(result).toBe("skipped-anonymous");
        expect(await repos.outbox.count()).toBe(0);
    });

    it("never publishes without a profile", async () => {
        await db.routines.put(monday);
        await db.workoutLogs.put(trained);
        const result = await publishOwnStats(repos, { userId: "u1", today: "2026-11-17", registered: true });
        expect(result).toBe("skipped-no-profile");
        expect(await repos.stats.get("u1")).toBeUndefined();
        expect(await repos.outbox.count()).toBe(0);
    });

    it("skips a snapshot already computed today unless forced", async () => {
        await seed();
        const input = { userId: "u1", today: "2026-11-17", registered: true };
        await publishOwnStats(repos, input);
        expect(await publishOwnStats(repos, { ...input, onlyIfStale: true })).toBe("skipped-fresh");
        expect(await publishOwnStats(repos, input)).toBe("published");
    });

    it("republishes when the stored snapshot is from an earlier day", async () => {
        await seed();
        await publishOwnStats(repos, { userId: "u1", today: "2026-11-16", registered: true });
        const result = await publishOwnStats(repos, {
            userId: "u1",
            today: "2026-11-17",
            registered: true,
            onlyIfStale: true,
        });
        expect(result).toBe("published");
        expect((await repos.stats.get("u1"))?.date).toBe("2026-11-17");
    });

    it("publishes when nothing was stored yet, even with onlyIfStale", async () => {
        await seed();
        const result = await publishOwnStats(repos, {
            userId: "u1",
            today: "2026-11-17",
            registered: true,
            onlyIfStale: true,
        });
        expect(result).toBe("published");
    });

    it("only reads the data of that user", async () => {
        await seed();
        await db.workoutLogs.put({ ...trained, id: "other", userId: "u2" });
        await publishOwnStats(repos, { userId: "u1", today: "2026-11-17", registered: true });
        expect((await repos.stats.get("u1"))?.stats.workoutsCount).toBe(1);
    });
});
