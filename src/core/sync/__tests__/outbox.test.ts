import {
    enqueue,
    markFailed,
    markSucceeded,
    nextBatch,
    type EnqueueInput,
    type OutboxEntry,
} from "../outbox";

function input(overrides: Partial<EnqueueInput> = {}): EnqueueInput {
    return {
        id: "o1",
        entity: "routine",
        entityId: "r1",
        op: "upsert",
        payload: { v: 1 },
        now: 1000,
        ...overrides,
    };
}

function entry(overrides: Partial<OutboxEntry> = {}): OutboxEntry {
    return {
        id: "o1",
        entity: "routine",
        entityId: "r1",
        op: "upsert",
        payload: {},
        createdAt: 1000,
        attempts: 0,
        nextAttemptAt: 1000,
        ...overrides,
    };
}

describe("enqueue", () => {
    it("adds a fresh entry that is immediately due", () => {
        const out = enqueue([], input());
        expect(out).toEqual([
            {
                id: "o1",
                entity: "routine",
                entityId: "r1",
                op: "upsert",
                payload: { v: 1 },
                createdAt: 1000,
                attempts: 0,
                nextAttemptAt: 1000,
            },
        ]);
    });

    it("does not mutate the input list", () => {
        const list = [entry()];
        enqueue(list, input({ id: "o2", entityId: "r2" }));
        expect(list).toHaveLength(1);
    });

    it("coalesces upserts of the same entity keeping the original createdAt", () => {
        const first = enqueue([], input({ now: 1000 }));
        const second = enqueue(first, input({ id: "o2", payload: { v: 2 }, now: 5000 }));
        expect(second).toHaveLength(1);
        expect(second[0]).toMatchObject({ id: "o2", payload: { v: 2 }, createdAt: 1000, nextAttemptAt: 5000 });
    });

    it("resets attempts and error when coalescing", () => {
        const failed = entry({ attempts: 4, lastError: "boom", nextAttemptAt: 99999 });
        const [out] = enqueue([failed], input({ id: "o2", now: 2000 }));
        expect(out.attempts).toBe(0);
        expect(out.lastError).toBeUndefined();
        expect(out.nextAttemptAt).toBe(2000);
    });

    it("lets a delete supersede a pending upsert", () => {
        const first = enqueue([], input());
        const out = enqueue(first, input({ id: "o2", op: "delete", payload: null, now: 3000 }));
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({ op: "delete", createdAt: 1000 });
    });

    it("lets a later upsert replace a pending delete", () => {
        const first = enqueue([], input({ op: "delete", payload: null }));
        const out = enqueue(first, input({ id: "o2", op: "upsert", now: 3000 }));
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({ op: "upsert", createdAt: 1000 });
    });

    it("keeps different entities and entityIds separate", () => {
        let list: OutboxEntry[] = [];
        list = enqueue(list, input({ id: "a", entity: "routine", entityId: "x" }));
        list = enqueue(list, input({ id: "b", entity: "workoutLog", entityId: "x" }));
        list = enqueue(list, input({ id: "c", entity: "routine", entityId: "y" }));
        expect(list).toHaveLength(3);
    });
});

describe("nextBatch", () => {
    it("returns only due entries", () => {
        const due = entry({ id: "a", entityId: "a", nextAttemptAt: 100 });
        const later = entry({ id: "b", entityId: "b", nextAttemptAt: 101 });
        expect(nextBatch([due, later], 100).map((e) => e.id)).toEqual(["a"]);
    });

    it("orders by entity priority then createdAt", () => {
        const log = entry({ id: "log", entity: "workoutLog", entityId: "l", createdAt: 1 });
        const customLate = entry({ id: "c2", entity: "customExercise", entityId: "c2", createdAt: 20 });
        const customEarly = entry({ id: "c1", entity: "customExercise", entityId: "c1", createdAt: 10 });
        const routine = entry({ id: "r", entity: "routine", entityId: "r", createdAt: 99 });
        expect(nextBatch([log, customLate, routine, customEarly], 1000).map((e) => e.id)).toEqual([
            "r",
            "c1",
            "c2",
            "log",
        ]);
    });

    it("does not mutate the input list", () => {
        const list = [
            entry({ id: "b", entity: "workoutLog", entityId: "b" }),
            entry({ id: "a", entity: "routine", entityId: "a" }),
        ];
        nextBatch(list, 1000);
        expect(list.map((e) => e.id)).toEqual(["b", "a"]);
    });
});

describe("markFailed", () => {
    it("increments attempts, records the error and schedules with the base delay", () => {
        const out = markFailed(entry(), "network", 10_000, 1);
        expect(out).toMatchObject({ attempts: 1, lastError: "network", nextAttemptAt: 12_000 });
    });

    it("doubles the delay on each attempt", () => {
        let e = entry();
        const delays: number[] = [];
        for (let i = 0; i < 4; i++) {
            const out = markFailed(e, "x", 0, 1);
            delays.push(out.nextAttemptAt);
            e = out;
        }
        expect(delays).toEqual([2_000, 4_000, 8_000, 16_000]);
    });

    it("caps the delay at 5 minutes", () => {
        const out = markFailed(entry({ attempts: 20 }), "x", 0, 1);
        expect(out.nextAttemptAt).toBe(300_000);
    });

    it("applies injected jitter between 50% and 100% of the delay", () => {
        expect(markFailed(entry(), "x", 0, 0).nextAttemptAt).toBe(1_000);
        expect(markFailed(entry(), "x", 0, 0.5).nextAttemptAt).toBe(1_500);
        expect(markFailed(entry(), "x", 0, 1).nextAttemptAt).toBe(2_000);
    });

    it("does not mutate the entry", () => {
        const e = entry();
        markFailed(e, "x", 0, 1);
        expect(e.attempts).toBe(0);
    });
});

describe("markSucceeded", () => {
    it("removes the acknowledged entry by id", () => {
        const a = entry({ id: "a", entityId: "a" });
        const b = entry({ id: "b", entityId: "b" });
        expect(markSucceeded([a, b], "a")).toEqual([b]);
    });

    it("leaves a coalesced newer entry alone when the old id is acknowledged", () => {
        const first = enqueue([], input({ id: "old" }));
        const second = enqueue(first, input({ id: "new", payload: { v: 2 } }));
        expect(markSucceeded(second, "old")).toEqual(second);
    });
});
