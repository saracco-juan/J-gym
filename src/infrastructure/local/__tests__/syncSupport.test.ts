import "fake-indexeddb/auto";
import type { IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import { JgymDatabase } from "../db";
import { createLocalRepositories, type LocalRepositories } from "../localRepositories";

let db: JgymDatabase;
let repos: LocalRepositories;
let writes = 0;
let seq = 0;
let dbCount = 0;

beforeEach(() => {
    writes = 0;
    seq = 0;
    db = new JgymDatabase(`jgym-sync-support-${dbCount++}`);
    repos = createLocalRepositories(db, {
        now: () => 1000,
        newId: () => `id-${++seq}`,
        onWrite: () => {
            writes++;
        },
    });
});

afterEach(() => {
    db.close();
});

const routine: IRoutineTemplate = { id: "local-1", userId: "u1", dayName: "lunes", exercises: [] };
const log: IWorkoutLog = {
    id: "l1",
    userId: "u1",
    templateId: "local-1",
    date: "2026-01-05",
    exercises: [],
    completedAt: null,
};

describe("write notifications", () => {
    it("notifies after every synced write", async () => {
        await repos.routines.save(routine);
        await repos.workoutLogs.save(log);
        await repos.customExercises.create("u1", { name: "Remo", muscleGroup: "back", isBodyweight: false });
        await repos.routines.remove("local-1");
        expect(writes).toBe(4);
    });

    it("does not notify for local-only writes", async () => {
        await repos.meta.set("k", 1);
        await repos.activeSession.put("u1", { exercises: [] });
        expect(writes).toBe(0);
    });
});

describe("rekeyRoutine", () => {
    it("moves the routine to the server id and re-enqueues the upsert", async () => {
        await repos.routines.save(routine);
        await repos.sync.rekeyRoutine("local-1", "srv-1");

        expect(await repos.routines.get("local-1")).toBeUndefined();
        expect(await repos.routines.get("srv-1")).toMatchObject({ id: "srv-1", dayName: "lunes" });
        const entries = await repos.outbox.list();
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ entity: "routine", entityId: "srv-1", op: "upsert" });
        expect(entries[0].payload).toMatchObject({ id: "srv-1" });
    });

    it("re-points logs and their pending outbox payloads", async () => {
        await repos.routines.save(routine);
        await repos.workoutLogs.save(log);
        await repos.sync.rekeyRoutine("local-1", "srv-1");

        expect((await repos.workoutLogs.get("l1"))?.templateId).toBe("srv-1");
        const logEntry = (await repos.outbox.list()).find((e) => e.entity === "workoutLog");
        expect(logEntry?.payload).toMatchObject({ templateId: "srv-1" });
    });

    it("is a no-op when the routine does not exist", async () => {
        expect(await repos.sync.rekeyRoutine("nope", "srv-1")).toBe(false);
        expect(await repos.outbox.list()).toHaveLength(0);
    });
});

describe("applyPull", () => {
    it("stores server data without enqueuing anything or notifying", async () => {
        await repos.sync.applyPull({
            routines: [routine],
            customExercises: [{ id: "c1", userId: "u1", name: "Remo", muscleGroup: "back", isBodyweight: false }],
            logs: [log],
        });
        expect(await repos.routines.listByUser("u1")).toHaveLength(1);
        expect(await repos.customExercises.listByUser("u1")).toHaveLength(1);
        expect(await repos.workoutLogs.listByUser("u1")).toHaveLength(1);
        expect(await repos.outbox.list()).toHaveLength(0);
        expect(writes).toBe(0);
    });
});

describe("hasUserData / clearAll / count", () => {
    it("detects data per user", async () => {
        expect(await repos.sync.hasUserData("u1")).toBe(false);
        await repos.workoutLogs.save(log);
        expect(await repos.sync.hasUserData("u1")).toBe(true);
        expect(await repos.sync.hasUserData("u2")).toBe(false);
    });

    it("counts the outbox and clears every table", async () => {
        await repos.routines.save(routine);
        await repos.meta.set("k", 1);
        await repos.activeSession.put("u1", { exercises: [] });
        expect(await repos.outbox.count()).toBe(1);
        await repos.sync.clearAll();
        expect(await repos.outbox.count()).toBe(0);
        expect(await repos.routines.listByUser("u1")).toHaveLength(0);
        expect(await repos.meta.get("k")).toBeUndefined();
        expect(await repos.activeSession.get("u1")).toBeUndefined();
    });
});
