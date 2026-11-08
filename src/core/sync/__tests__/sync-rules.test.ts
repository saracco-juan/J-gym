import type { IRoutineTemplate, IWorkoutLog } from "@/core/domain";
import { coalesceEntry, type OutboxEntry } from "../outbox";
import { classifySyncError } from "../classify-error";
import { detachTemplate, toSyncCommand } from "../commands";
import { planFlush } from "../flush-plan";
import { decideInitialPull, planRoutineRekeys } from "../adoption";
import { canClearLocalData, resolveUserId } from "../local-user";

function entry(
    partial: Partial<OutboxEntry> & Pick<OutboxEntry, "entity" | "entityId" | "op">
): OutboxEntry {
    return {
        ...coalesceEntry(undefined, {
            id: `e-${partial.entityId}`,
            entity: partial.entity,
            entityId: partial.entityId,
            op: partial.op,
            payload: partial.payload ?? null,
            now: partial.createdAt ?? 100,
        }),
        ...partial,
    };
}

const routine: IRoutineTemplate = { id: "r1", userId: "u1", dayName: "lunes", exercises: [] };
const log: IWorkoutLog = {
    id: "l1",
    userId: "u1",
    templateId: "r1",
    date: "2026-01-05",
    exercises: [],
    completedAt: "2026-01-05T10:00:00.000Z",
};

describe("classifySyncError", () => {
    it("treats 401 and 403 as auth", () => {
        expect(classifySyncError({ status: 401 })).toBe("auth");
        expect(classifySyncError({ status: 403, code: "42501" })).toBe("auth");
    });

    it("treats JWT problems as auth even without a status", () => {
        expect(classifySyncError({ code: "PGRST301" })).toBe("auth");
        expect(classifySyncError({ message: "JWT expired" })).toBe("auth");
    });

    it("detects unique and foreign key violations", () => {
        expect(classifySyncError({ status: 409, code: "23505" })).toBe("unique-conflict");
        expect(classifySyncError({ status: 409, code: "23503" })).toBe("missing-parent");
    });

    it("detects network failures", () => {
        expect(classifySyncError({ message: "TypeError: Failed to fetch" })).toBe("network");
        expect(classifySyncError({ status: 0 })).toBe("network");
        expect(classifySyncError({ message: "Load failed" })).toBe("network");
    });

    it("retries everything else with backoff", () => {
        expect(classifySyncError({ status: 500, message: "boom" })).toBe("retry");
        expect(classifySyncError({})).toBe("retry");
    });
});

describe("planFlush", () => {
    const upsertR = entry({ entity: "routine", entityId: "r1", op: "upsert", payload: routine });

    it("pauses without a session and does not select entries", () => {
        expect(planFlush({ entries: [upsertR], now: 1000, userId: null })).toEqual({
            kind: "paused",
            reason: "signed-out",
        });
    });

    it("orders the due batch parents first", () => {
        const logE = entry({ entity: "workoutLog", entityId: "l1", op: "upsert", payload: log, createdAt: 50 });
        const plan = planFlush({ entries: [logE, upsertR], now: 1000, userId: "u1" });
        expect(plan.kind).toBe("send");
        if (plan.kind === "send") {
            expect(plan.batch.map((e) => e.entity)).toEqual(["routine", "workoutLog"]);
        }
    });

    it("skips entries that are not due yet", () => {
        const later = { ...upsertR, nextAttemptAt: 5000 };
        expect(planFlush({ entries: [later], now: 1000, userId: "u1" })).toEqual({ kind: "send", batch: [] });
    });

    it("does not send upserts that belong to another user", () => {
        const other = entry({
            entity: "routine",
            entityId: "r9",
            op: "upsert",
            payload: { ...routine, id: "r9", userId: "someone-else" },
        });
        const del = entry({ entity: "routine", entityId: "r8", op: "delete" });
        const plan = planFlush({ entries: [other, del, upsertR], now: 1000, userId: "u1" });
        if (plan.kind !== "send") throw new Error("expected send");
        expect(plan.batch.map((e) => e.entityId).sort()).toEqual(["r1", "r8"]);
    });
});

describe("toSyncCommand", () => {
    it("maps a routine upsert to a row owned by the session user", () => {
        const cmd = toSyncCommand(
            entry({ entity: "routine", entityId: "r1", op: "upsert", payload: { ...routine, userId: "stale" } }),
            "u1",
            "2026-01-01T00:00:00.000Z"
        );
        expect(cmd).toMatchObject({
            kind: "upsert",
            table: "routine_templates",
            row: { id: "r1", user_id: "u1", day_name: "lunes", schema_version: 2 },
        });
    });

    it("maps a log upsert and keeps an empty template as null", () => {
        const cmd = toSyncCommand(
            entry({ entity: "workoutLog", entityId: "l1", op: "upsert", payload: { ...log, templateId: "" } }),
            "u1",
            "x"
        );
        expect(cmd).toMatchObject({
            kind: "upsert",
            table: "workout_logs",
            row: { id: "l1", user_id: "u1", template_id: null },
        });
    });

    it("maps a custom exercise upsert, clearing deleted_at", () => {
        const cmd = toSyncCommand(
            entry({
                entity: "customExercise",
                entityId: "c1",
                op: "upsert",
                payload: { id: "c1", userId: "u1", name: "Remo", muscleGroup: "back", isBodyweight: false },
            }),
            "u1",
            "x"
        );
        expect(cmd).toEqual({
            kind: "upsert",
            table: "custom_exercises",
            row: { id: "c1", user_id: "u1", name: "Remo", muscle_group: "back", is_bodyweight: false, deleted_at: null },
        });
    });

    it("hard deletes routines and logs, soft deletes custom exercises", () => {
        expect(toSyncCommand(entry({ entity: "routine", entityId: "r1", op: "delete" }), "u1", "now")).toEqual({
            kind: "delete",
            table: "routine_templates",
            id: "r1",
        });
        expect(toSyncCommand(entry({ entity: "workoutLog", entityId: "l1", op: "delete" }), "u1", "now")).toEqual({
            kind: "delete",
            table: "workout_logs",
            id: "l1",
        });
        expect(toSyncCommand(entry({ entity: "customExercise", entityId: "c1", op: "delete" }), "u1", "now")).toEqual({
            kind: "soft-delete",
            table: "custom_exercises",
            id: "c1",
            deletedAt: "now",
        });
    });
});

describe("detachTemplate", () => {
    it("nulls the template of a log upsert and refuses anything else", () => {
        const logCmd = toSyncCommand(entry({ entity: "workoutLog", entityId: "l1", op: "upsert", payload: log }), "u1", "x");
        expect(detachTemplate(logCmd)).toMatchObject({ row: { id: "l1", template_id: null } });

        const routineCmd = toSyncCommand(entry({ entity: "routine", entityId: "r1", op: "upsert", payload: routine }), "u1", "x");
        expect(detachTemplate(routineCmd)).toBeNull();
    });
});

describe("planRoutineRekeys", () => {
    it("re-keys a local routine to the server id of the same day", () => {
        const local = [{ ...routine, id: "local-1" }, { ...routine, id: "local-2", dayName: "martes" }];
        const server = [
            { id: "srv-1", dayName: "lunes" },
            { id: "local-2", dayName: "martes" },
        ];
        expect(planRoutineRekeys(local, server)).toEqual([{ from: "local-1", to: "srv-1" }]);
    });

    it("returns nothing when ids already match or the day is unknown to the server", () => {
        expect(planRoutineRekeys([routine], [{ id: "r1", dayName: "lunes" }])).toEqual([]);
        expect(planRoutineRekeys([routine], [{ id: "x", dayName: "martes" }])).toEqual([]);
    });
});

describe("decideInitialPull", () => {
    it("skips once pulled", () => {
        expect(decideInitialPull({ alreadyPulled: true, localHasData: false })).toBe("skip");
    });
    it("pulls everything into an empty local database", () => {
        expect(decideInitialPull({ alreadyPulled: false, localHasData: false })).toBe("pull-all");
    });
    it("only reconciles routine ids when local data already exists", () => {
        expect(decideInitialPull({ alreadyPulled: false, localHasData: true })).toBe("reconcile-routines");
    });
});

describe("resolveUserId", () => {
    it("prefers the session user", () => {
        expect(resolveUserId({ sessionUserId: "u1", cachedUserId: "u0", online: true })).toBe("u1");
    });
    it("falls back to the cached user only while offline", () => {
        expect(resolveUserId({ sessionUserId: null, cachedUserId: "u0", online: false })).toBe("u0");
        expect(resolveUserId({ sessionUserId: null, cachedUserId: "u0", online: true })).toBeNull();
        expect(resolveUserId({ sessionUserId: null, cachedUserId: null, online: false })).toBeNull();
    });
});

describe("canClearLocalData", () => {
    it("only allows clearing when nothing is pending", () => {
        expect(canClearLocalData(0)).toBe(true);
        expect(canClearLocalData(2)).toBe(false);
    });
});
