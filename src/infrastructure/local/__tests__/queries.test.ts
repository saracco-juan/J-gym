import "fake-indexeddb/auto";
import type { IRoutineExercise, IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import { JgymDatabase } from "../db";
import { createLocalRepositories, type LocalRepositories } from "../localRepositories";
import {
    hasRoutines,
    loadDayData,
    loadPersonalBests,
    resetUserData,
    saveWeeklyRoutine,
} from "../queries";

let db: JgymDatabase;
let repos: LocalRepositories;
let seq = 0;
let dbCount = 0;
const newId = () => `id-${++seq}`;

beforeEach(() => {
    seq = 0;
    db = new JgymDatabase(`jgym-queries-${dbCount++}`);
    repos = createLocalRepositories(db, { now: () => 1000, newId });
});

afterEach(() => {
    db.close();
});

const bench: IRoutineExercise = {
    exercise: { id: "bench", name: "Press banca" },
    ref: { source: "catalog", id: "bench-press" },
    sets: [{ setNumber: 1, targetReps: 12, targetWeight: 60 }],
};

const monday: IRoutineTemplate = { id: "r1", userId: "u1", dayName: "lunes", exercises: [bench] };

function log(id: string, date: string, weight: number, userId = "u1"): IWorkoutLog {
    return {
        id,
        userId,
        templateId: "r1",
        date,
        exercises: [
            {
                exercise: { id: "bench", name: "Press banca" },
                ref: { source: "catalog", id: "bench-press" },
                sets: [{ setNumber: 1, actualReps: 5, actualWeight: weight }],
            },
        ],
        completedAt: `${date}T10:00:00.000Z`,
    };
}

describe("hasRoutines", () => {
    it("is scoped by user", async () => {
        expect(await hasRoutines(repos, "u1")).toBe(false);
        await repos.routines.save(monday);
        expect(await hasRoutines(repos, "u1")).toBe(true);
        expect(await hasRoutines(repos, "u2")).toBe(false);
    });
});

describe("loadDayData", () => {
    it("returns the routine of that weekday for today and future dates", async () => {
        await repos.routines.save(monday);
        // 2026-01-05 is a Monday
        const today = await loadDayData(repos, "u1", "2026-01-05", "2026-01-05");
        expect(today).toMatchObject({ type: "template", data: { id: "r1" } });
        const future = await loadDayData(repos, "u1", "2026-01-12", "2026-01-05");
        expect(future.type).toBe("template");
        expect((await loadDayData(repos, "u1", "2026-01-06", "2026-01-05")).type).toBe("empty");
    });

    it("returns the log of a past date, or empty when none", async () => {
        await repos.workoutLogs.save(log("l1", "2026-01-02", 60));
        expect(await loadDayData(repos, "u1", "2026-01-02", "2026-01-05")).toMatchObject({
            type: "log",
            data: { id: "l1" },
        });
        expect((await loadDayData(repos, "u1", "2026-01-03", "2026-01-05")).type).toBe("empty");
    });

    it("does not leak another user's data", async () => {
        await repos.routines.save({ ...monday, userId: "u2" });
        expect((await loadDayData(repos, "u1", "2026-01-05", "2026-01-05")).type).toBe("empty");
    });
});

describe("loadPersonalBests", () => {
    it("computes bests per exercise key from the user's logs only", async () => {
        await repos.workoutLogs.save(log("l1", "2026-01-02", 60));
        await repos.workoutLogs.save(log("l2", "2026-01-03", 80));
        await repos.workoutLogs.save(log("l3", "2026-01-03", 200, "u2"));
        expect(await loadPersonalBests(repos, "u1")).toEqual({ "bench-press": 80 });
    });
});

describe("saveWeeklyRoutine", () => {
    it("creates one routine per day with client UUIDs and enqueues each", async () => {
        await saveWeeklyRoutine(repos, "u1", [
            { dayName: "lunes", exercises: [bench] },
            { dayName: "martes", exercises: [] },
        ], newId);
        const saved = await repos.routines.listByUser("u1");
        expect(saved.map((r) => r.dayName).sort()).toEqual(["lunes", "martes"]);
        expect(saved.every((r) => r.userId === "u1" && r.id.startsWith("id-"))).toBe(true);
        expect(await repos.outbox.count()).toBe(2);
    });

    it("reuses the id of an existing routine for the same day", async () => {
        await repos.routines.save(monday);
        await saveWeeklyRoutine(repos, "u1", [{ dayName: "lunes", exercises: [] }]);
        const saved = await repos.routines.listByUser("u1");
        expect(saved).toHaveLength(1);
        expect(saved[0].id).toBe("r1");
        expect(saved[0].exercises).toEqual([]);
    });
});

describe("resetUserData", () => {
    it("removes the user's data locally, queues the deletes and clears the active session", async () => {
        await repos.routines.save(monday);
        await repos.workoutLogs.save(log("l1", "2026-01-02", 60));
        await repos.activeSession.put("u1", { exercises: [] });
        await resetUserData(repos, "u1");
        expect(await repos.sync.hasUserData("u1")).toBe(false);
        expect(await repos.activeSession.get("u1")).toBeUndefined();
        const entries = await repos.outbox.list();
        expect(entries.every((e) => e.op === "delete")).toBe(true);
        expect(entries).toHaveLength(2);
    });
});
