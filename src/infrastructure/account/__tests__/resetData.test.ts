import "fake-indexeddb/auto";
import type { IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import { JgymDatabase } from "@/infrastructure/local/db";
import {
    createLocalRepositories,
    type LocalRepositories,
} from "@/infrastructure/local/localRepositories";
import { loadWorkoutInProgress, resetOwnData } from "../resetData";

let db: JgymDatabase;
let repos: LocalRepositories;
let seq = 0;
let dbCount = 0;

beforeEach(() => {
    seq = 0;
    db = new JgymDatabase(`jgym-reset-${dbCount++}`);
    repos = createLocalRepositories(db, { now: () => 1000, newId: () => `id-${++seq}` });
});

afterEach(() => {
    db.close();
});

const routine = (userId: string): IRoutineTemplate => ({
    id: `r-${userId}`,
    userId,
    dayName: "lunes",
    exercises: [],
});

const log = (userId: string): IWorkoutLog => ({
    id: `l-${userId}`,
    userId,
    templateId: `r-${userId}`,
    date: "2026-01-02",
    exercises: [],
    completedAt: "2026-01-02T10:00:00.000Z",
});

async function seed(userId: string) {
    await repos.routines.save(routine(userId));
    await repos.workoutLogs.save(log(userId));
    await repos.customExercises.save({
        id: `c-${userId}`,
        userId,
        name: "Curl",
        isBodyweight: false,
    } as never);
    await repos.activeSession.put(userId, { exercises: [] } as never);
}

const profile = { userId: "u1", displayName: "Juan", avatarColor: "#ff0000" };

describe("resetOwnData", () => {
    it("deletes routines, logs, custom exercises and the session of the user only", async () => {
        await seed("u1");
        await seed("u2");
        await resetOwnData(repos, { userId: "u1", today: "2026-01-05", registered: false });

        expect(await repos.sync.hasUserData("u1")).toBe(false);
        expect(await repos.activeSession.get("u1")).toBeUndefined();
        expect(await repos.sync.hasUserData("u2")).toBe(true);
        expect(await repos.activeSession.get("u2")).toBeDefined();
    });

    it("queues a delete for each entity kind", async () => {
        await seed("u1");
        await resetOwnData(repos, { userId: "u1", today: "2026-01-05", registered: false });
        const entries = await repos.outbox.list();
        expect(entries.map((e) => e.entity).sort()).toEqual(["customExercise", "routine", "workoutLog"]);
        expect(entries.every((e) => e.op === "delete")).toBe(true);
    });

    it("keeps the profile and queues an empty stats snapshot for a registered user", async () => {
        await repos.profiles.save(profile);
        await seed("u1");
        await resetOwnData(repos, { userId: "u1", today: "2026-01-05", registered: true });

        expect(await repos.profiles.get("u1")).toBeDefined();
        const stats = (await repos.outbox.list()).find((e) => e.entity === "stats");
        expect(stats?.op).toBe("upsert");
        const stored = await repos.stats.get("u1");
        expect(stored?.date).toBe("2026-01-05");
        expect(stored?.stats.xp).toBe(0);
        expect(stored?.stats.streak).toBe(0);
    });

    it("publishes no stats for an anonymous account", async () => {
        await seed("u1");
        await resetOwnData(repos, { userId: "u1", today: "2026-01-05", registered: false });
        expect((await repos.outbox.list()).some((e) => e.entity === "stats")).toBe(false);
    });
});

describe("loadWorkoutInProgress", () => {
    const base = { userId: "u1", today: "2026-01-05" };

    it("is false with nothing running", async () => {
        expect(await loadWorkoutInProgress(repos, { ...base, storeHasSession: false })).toBe(false);
    });

    it("is true when the store holds a session", async () => {
        expect(await loadWorkoutInProgress(repos, { ...base, storeHasSession: true })).toBe(true);
    });

    it("is true for a session saved today and false for a stale one", async () => {
        const meta = (date: string) => ({
            templateId: "r1",
            dayName: "lunes",
            date,
            startedAt: 1,
            logId: "l1",
        });
        await repos.activeSession.put("u1", { exercises: [] } as never, meta("2026-01-05"));
        expect(await loadWorkoutInProgress(repos, { ...base, storeHasSession: false })).toBe(true);
        await repos.activeSession.put("u1", { exercises: [] } as never, meta("2026-01-04"));
        expect(await loadWorkoutInProgress(repos, { ...base, storeHasSession: false })).toBe(false);
    });
});
