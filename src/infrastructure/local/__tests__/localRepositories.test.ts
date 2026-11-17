import "fake-indexeddb/auto";
import type { IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import { JgymDatabase } from "../db";
import { createLocalRepositories, type LocalRepositories } from "../localRepositories";

let db: JgymDatabase;
let repos: LocalRepositories;
let clock = 1000;
let seq = 0;
let dbCount = 0;

beforeEach(() => {
    clock = 1000;
    seq = 0;
    db = new JgymDatabase(`jgym-test-${dbCount++}`);
    repos = createLocalRepositories(db, { now: () => clock, newId: () => `id-${++seq}` });
});

afterEach(async () => {
    db.close();
});

const routine: IRoutineTemplate = {
    id: "r1",
    userId: "u1",
    dayName: "lunes",
    exercises: [],
};

const log: IWorkoutLog = {
    id: "l1",
    userId: "u1",
    templateId: "r1",
    date: "2026-01-05",
    exercises: [],
    completedAt: null,
};

describe("local repositories", () => {
    it("writes data and the outbox entry together", async () => {
        await repos.routines.save(routine);
        expect(await repos.routines.get("r1")).toEqual(routine);
        const entries = await repos.outbox.list();
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ entity: "routine", entityId: "r1", op: "upsert", payload: routine });
    });

    it("coalesces repeated saves into one outbox entry keeping createdAt", async () => {
        await repos.routines.save(routine);
        clock = 5000;
        await repos.routines.save({ ...routine, dayName: "martes" });
        const entries = await repos.outbox.list();
        expect(entries).toHaveLength(1);
        expect(entries[0].createdAt).toBe(1000);
        expect(entries[0].payload).toMatchObject({ dayName: "martes" });
    });

    it("rolls back the data write when the outbox write fails", async () => {
        const original = db.outbox.add.bind(db.outbox);
        db.outbox.add = (() => Promise.reject(new Error("quota"))) as unknown as typeof db.outbox.add;
        await expect(repos.routines.save(routine)).rejects.toThrow();
        db.outbox.add = original;
        expect(await repos.routines.get("r1")).toBeUndefined();
        expect(await repos.outbox.list()).toHaveLength(0);
    });

    it("turns a remove into a delete entry superseding the pending upsert", async () => {
        await repos.routines.save(routine);
        await repos.routines.remove("r1");
        expect(await repos.routines.get("r1")).toBeUndefined();
        const entries = await repos.outbox.list();
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ op: "delete", entityId: "r1" });
    });

    it("creates custom exercises with a client-generated id", async () => {
        const created = await repos.customExercises.create("u1", {
            name: "Remo con mancuerna",
            muscleGroup: "back",
            isBodyweight: false,
        });
        expect(created.id).toBe("id-1");
        expect(await repos.customExercises.listByUser("u1")).toHaveLength(1);
        expect((await repos.outbox.list())[0]).toMatchObject({ entity: "customExercise", entityId: "id-1" });
    });

    it("saves logs, finds them by date and orders the batch routines first", async () => {
        await repos.workoutLogs.save(log);
        await repos.routines.save(routine);
        expect(await repos.workoutLogs.getByDate("u1", "2026-01-05")).toEqual(log);
        const batch = await repos.outbox.dueBatch(clock);
        expect(batch.map((e) => e.entity)).toEqual(["routine", "workoutLog"]);
    });

    it("keeps the active session local (no outbox entry)", async () => {
        await repos.activeSession.put("u1", { exercises: [] });
        expect((await repos.activeSession.get("u1"))?.state).toEqual({ exercises: [] });
        expect(await repos.outbox.list()).toHaveLength(0);
        await repos.activeSession.clear("u1");
        expect(await repos.activeSession.get("u1")).toBeUndefined();
    });

    it("backs off failed entries and removes completed ones", async () => {
        await repos.routines.save(routine);
        const [entry] = await repos.outbox.list();
        await repos.outbox.fail(entry.id, "offline", 2000, 1);
        const [failed] = await repos.outbox.list();
        expect(failed).toMatchObject({ attempts: 1, lastError: "offline", nextAttemptAt: 4000 });
        expect(await repos.outbox.dueBatch(3000)).toHaveLength(0);
        await repos.outbox.complete(entry.id);
        expect(await repos.outbox.list()).toHaveLength(0);
    });

    it("stores and reads meta values", async () => {
        await repos.meta.set("lastPull", 42);
        expect(await repos.meta.get<number>("lastPull")).toBe(42);
    });
});
