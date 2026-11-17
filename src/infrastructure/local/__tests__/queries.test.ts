import "fake-indexeddb/auto";
import type { IRoutineExercise, IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import { createSession, sessionReducer } from "@/core/session";
import { StandardHypertrophyStrategy } from "@/core/strategies";
import { JgymDatabase } from "../db";
import { createLocalRepositories, type LocalRepositories } from "../localRepositories";
import {
    finishWorkoutLocally,
    hasRoutines,
    isDayLocked,
    loadDayData,
    loadExerciseHistory,
    loadRestorableSession,
    loadPersonalBests,
    loadStagnantExercises,
    loadRoutineEditor,
    resetUserData,
    saveRoutineEdits,
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

    it("offers to start today's routine, or resume it when a session is in progress", async () => {
        await repos.routines.save(monday);
        expect(await loadDayData(repos, "u1", "2026-01-05", "2026-01-05")).toMatchObject({
            type: "template",
            action: "start",
        });
        const session = createSession([bench]);
        await repos.activeSession.put("u1", session, {
            templateId: "r1",
            dayName: "lunes",
            date: "2026-01-05",
            startedAt: 1,
            logId: "l-active",
        });
        expect(await loadDayData(repos, "u1", "2026-01-05", "2026-01-05")).toMatchObject({
            type: "template",
            action: "resume",
        });
    });

    it("does not resume a stale session started on another day", async () => {
        await repos.routines.save(monday);
        await repos.activeSession.put("u1", createSession([bench]), {
            templateId: "r1",
            dayName: "lunes",
            date: "2026-01-04",
            startedAt: 1,
            logId: "l-stale",
        });
        expect(await loadDayData(repos, "u1", "2026-01-05", "2026-01-05")).toMatchObject({
            type: "template",
            action: "start",
        });
    });

    it("marks future days with the future action", async () => {
        await repos.routines.save(monday);
        expect(await loadDayData(repos, "u1", "2026-01-12", "2026-01-05")).toMatchObject({
            type: "template",
            action: "future",
        });
    });

    it("locks today once its workout is logged: the log wins over the template", async () => {
        await repos.routines.save(monday);
        await repos.workoutLogs.save(log("l-today", "2026-01-05", 60));
        expect(await loadDayData(repos, "u1", "2026-01-05", "2026-01-05")).toMatchObject({
            type: "log",
            data: { id: "l-today" },
        });
    });

    it("prefers the log over a stale active session for today", async () => {
        await repos.routines.save(monday);
        await repos.workoutLogs.save(log("l-today", "2026-01-05", 60));
        await repos.activeSession.put("u1", createSession([bench]), {
            templateId: "r1",
            dayName: "lunes",
            date: "2026-01-05",
            startedAt: 1,
            logId: "l-active",
        });
        expect((await loadDayData(repos, "u1", "2026-01-05", "2026-01-05")).type).toBe("log");
    });

    it("does not show another user's log for today", async () => {
        await repos.routines.save(monday);
        await repos.workoutLogs.save(log("l-other", "2026-01-05", 60, "u2"));
        expect((await loadDayData(repos, "u1", "2026-01-05", "2026-01-05")).type).toBe("template");
    });
});

describe("isDayLocked", () => {
    it("is true only when the user has a log for that date", async () => {
        await repos.workoutLogs.save(log("l1", "2026-01-05", 60));
        expect(await isDayLocked(repos, "u1", "2026-01-05")).toBe(true);
        expect(await isDayLocked(repos, "u1", "2026-01-06")).toBe(false);
        expect(await isDayLocked(repos, "u2", "2026-01-05")).toBe(false);
    });
});

describe("loadRestorableSession", () => {
    const meta = (date: string) => ({
        templateId: "r1",
        dayName: "lunes",
        date,
        startedAt: 1,
        logId: "l-active",
    });

    it("returns the saved session while its day has no log", async () => {
        await repos.activeSession.put("u1", createSession([bench]), meta("2026-01-05"));
        expect((await loadRestorableSession(repos, "u1"))?.meta?.templateId).toBe("r1");
    });

    it("returns undefined when there is nothing saved", async () => {
        expect(await loadRestorableSession(repos, "u1")).toBeUndefined();
    });

    it("discards a session whose day already has a log, so it cannot be started again", async () => {
        await repos.workoutLogs.save(log("l1", "2026-01-05", 60));
        await repos.activeSession.put("u1", createSession([bench]), meta("2026-01-05"));
        expect(await loadRestorableSession(repos, "u1")).toBeUndefined();
        expect(await repos.activeSession.get("u1")).toBeUndefined();
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

describe("loadStagnantExercises", () => {
    function failedLog(id: string, date: string, userId = "u1"): IWorkoutLog {
        const base = log(id, date, 60, userId);
        return { ...base, exercises: base.exercises.map((e) => ({ ...e, status: "failed" as const })) };
    }

    it("returns the exercise keys whose last three sessions failed, for this user only", async () => {
        await repos.workoutLogs.save(failedLog("l1", "2026-01-01"));
        await repos.workoutLogs.save(failedLog("l2", "2026-01-04"));
        await repos.workoutLogs.save(failedLog("l3", "2026-01-08"));
        await repos.workoutLogs.save(failedLog("l4", "2026-01-09", "u2"));
        expect([...(await loadStagnantExercises(repos, "u1"))]).toEqual(["bench-press"]);
        expect((await loadStagnantExercises(repos, "u2")).size).toBe(0);
    });
});

describe("loadExerciseHistory", () => {
    it("builds the history, record and series of one exercise from the user's logs only", async () => {
        await repos.workoutLogs.save(log("l1", "2026-01-02", 60));
        await repos.workoutLogs.save(log("l2", "2026-01-09", 70));
        await repos.workoutLogs.save(log("l3", "2026-01-10", 200, "u2"));
        const history = await loadExerciseHistory(repos, "u1", "bench-press");
        expect(history.name).toBe("Press banca");
        expect(history.sessions.map((s) => s.bestWeight)).toEqual([60, 70]);
        expect(history.record).toEqual({ weight: 70, reps: 5, date: "2026-01-09" });
        expect(history.series.points).toEqual([
            { date: "2026-01-02", value: 60 },
            { date: "2026-01-09", value: 70 },
        ]);
        expect(history.stagnant).toBe(false);
    });

    it("flags a stagnant exercise", async () => {
        for (const [id, date] of [["l1", "2026-01-01"], ["l2", "2026-01-04"], ["l3", "2026-01-08"]]) {
            const base = log(id, date, 60);
            await repos.workoutLogs.save({
                ...base,
                exercises: base.exercises.map((e) => ({ ...e, status: "failed" as const })),
            });
        }
        expect((await loadExerciseHistory(repos, "u1", "bench-press")).stagnant).toBe(true);
    });

    it("names a catalog exercise without history from the catalog", async () => {
        const history = await loadExerciseHistory(repos, "u1", "back-squat");
        expect(history.name).toBe("Sentadilla con barra");
        expect(history.sessions).toEqual([]);
        expect(history.record).toBeNull();
    });

    it("names a custom exercise without history from the local exercise", async () => {
        const created = await repos.customExercises.create("u1", {
            name: "Remo en anillas",
            muscleGroup: "back",
            isBodyweight: true,
        });
        const history = await loadExerciseHistory(repos, "u1", created.id);
        expect(history.name).toBe("Remo en anillas");
        expect(history.isBodyweight).toBe(true);
    });

    it("falls back to the key for an unknown exercise", async () => {
        expect((await loadExerciseHistory(repos, "u1", "unknown-key")).name).toBe("unknown-key");
    });
});

describe("loadRoutineEditor", () => {
    it("returns the user's routines and the template of the in-progress session", async () => {
        await repos.routines.save(monday);
        await repos.routines.save({ ...monday, id: "r9", userId: "u2" });
        await repos.activeSession.put("u1", createSession([bench]), {
            templateId: "r1",
            dayName: "lunes",
            date: "2026-01-05",
            startedAt: 1000,
            logId: "l-1",
        });
        const editor = await loadRoutineEditor(repos, "u1");
        expect(editor.templates.map((t) => t.id)).toEqual(["r1"]);
        expect(editor.activeTemplateId).toBe("r1");
    });

    it("has no active template without a saved session", async () => {
        await repos.routines.save(monday);
        expect((await loadRoutineEditor(repos, "u1")).activeTemplateId).toBeNull();
    });
});

describe("saveRoutineEdits", () => {
    const tuesday: IRoutineTemplate = { id: "r2", userId: "u1", dayName: "martes", exercises: [bench] };

    it("writes upserts and deletes locally and enqueues each one for sync", async () => {
        await repos.routines.save(monday);
        await repos.routines.save(tuesday);
        for (const entry of await repos.outbox.list()) await repos.outbox.complete(entry.id);

        const edited = { ...monday, exercises: [{ ...bench, sets: [{ setNumber: 1, targetReps: 10, targetWeight: 62.5 }] }] };
        await saveRoutineEdits(repos, { upserts: [edited], deletes: ["r2"] });

        expect(await repos.routines.get("r1")).toEqual(edited);
        expect(await repos.routines.get("r2")).toBeUndefined();
        const queued = (await repos.outbox.list()).map((e) => `${e.entity}:${e.entityId}:${e.op}`).sort();
        expect(queued).toEqual(["routine:r1:upsert", "routine:r2:delete"]);
    });

    it("leaves past logs and the in-progress session untouched", async () => {
        await repos.routines.save(monday);
        await repos.workoutLogs.save(log("l1", "2026-01-02", 60));
        const state = createSession([bench]);
        await repos.activeSession.put("u1", state, {
            templateId: "r1",
            dayName: "lunes",
            date: "2026-01-05",
            startedAt: 1000,
            logId: "l-2",
        });

        await saveRoutineEdits(repos, { upserts: [{ ...monday, exercises: [] }], deletes: [] });

        expect(await repos.workoutLogs.get("l1")).toEqual(log("l1", "2026-01-02", 60));
        expect((await repos.activeSession.get("u1"))?.state).toEqual(state);
    });

    it("does nothing for an empty plan", async () => {
        await saveRoutineEdits(repos, { upserts: [], deletes: [] });
        expect(await repos.outbox.count()).toBe(0);
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

describe("finishWorkoutLocally", () => {
    const strategy = new StandardHypertrophyStrategy();
    const finishInput = (overrides: Record<string, number> = {}) => ({
        userId: "u1",
        routineId: "r1",
        state: sessionReducer(createSession(monday.exercises), {
            type: "completeAllAsPlanned",
            exerciseKey: "bench",
        }),
        logId: "log-fixed",
        date: "2026-01-05",
        completedAtIso: "2026-01-05T10:00:00.000Z",
        strategy,
        weightOverrides: overrides,
    });

    it("saves log and updated routine in one commit and clears the active session", async () => {
        await repos.routines.save(monday);
        await repos.workoutLogs.save(log("old", "2026-01-01", 50));
        await repos.activeSession.put("u1", createSession(monday.exercises));

        const result = await finishWorkoutLocally(repos, finishInput());

        expect(result.newPRs).toEqual(["Press banca"]);
        expect(await repos.workoutLogs.get("log-fixed")).toMatchObject({ templateId: "r1", userId: "u1" });
        expect((await repos.routines.get("r1"))?.exercises[0].sets).toHaveLength(2);
        expect(await repos.activeSession.get("u1")).toBeUndefined();
        const pending = (await repos.outbox.list()).map((e) => `${e.entity}:${e.entityId}`);
        expect(pending).toEqual(expect.arrayContaining(["workoutLog:log-fixed", "routine:r1"]));
    });

    it("is idempotent when the same session is finished twice (same log id)", async () => {
        await repos.routines.save(monday);
        await finishWorkoutLocally(repos, finishInput());
        await finishWorkoutLocally(repos, finishInput());
        const logs = await repos.workoutLogs.listByUser("u1");
        expect(logs.filter((l) => l.id === "log-fixed")).toHaveLength(1);
    });

    it("still saves the log when the routine no longer exists", async () => {
        const result = await finishWorkoutLocally(repos, finishInput());
        expect(result.log.id).toBe("log-fixed");
        expect(await repos.workoutLogs.get("log-fixed")).toBeDefined();
        expect(await repos.routines.get("r1")).toBeUndefined();
    });
});
