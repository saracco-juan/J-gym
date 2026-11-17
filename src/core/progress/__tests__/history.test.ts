import type { ExerciseLogStatus, IWorkoutLog } from "../../domain";
import {
    buildExerciseHistory,
    buildProgressSeries,
    exerciseHistoryKey,
    findPersonalRecord,
} from "../history";

type Sets = Array<[reps: number, weight: number]>;

function exercise(
    sets: Sets,
    opts: {
        status?: ExerciseLogStatus;
        refId?: string | null;
        id?: string;
        name?: string;
    } = {}
): IWorkoutLog["exercises"][number] {
    const { status, refId = "bench-press", id = "row-bench", name = "Press banca" } = opts;
    return {
        exercise: { id, name },
        ...(refId ? { ref: { source: "catalog" as const, id: refId } } : {}),
        ...(status ? { status } : {}),
        sets: sets.map(([reps, weight], i) => ({ setNumber: i + 1, actualReps: reps, actualWeight: weight })),
    };
}

function log(date: string, exercises: IWorkoutLog["exercises"], id = `log-${date}`): IWorkoutLog {
    return { id, userId: "u1", templateId: "t", date, exercises, completedAt: null };
}

describe("buildExerciseHistory", () => {
    it("returns one entry per session, oldest first, whatever the input order", () => {
        const history = buildExerciseHistory(
            [
                log("2026-02-01", [exercise([[5, 70]], { status: "completed" })]),
                log("2026-01-01", [exercise([[5, 60]], { status: "failed" })]),
                log("2026-01-15", [exercise([[5, 65]], { status: "completed" })]),
            ],
            "bench-press"
        );
        expect(history.map((s) => s.date)).toEqual(["2026-01-01", "2026-01-15", "2026-02-01"]);
        expect(history.map((s) => s.logId)).toEqual(["log-2026-01-01", "log-2026-01-15", "log-2026-02-01"]);
    });

    it("picks the heaviest set as the best set and the most reps at that weight", () => {
        const [session] = buildExerciseHistory(
            [
                log("2026-01-01", [
                    exercise(
                        [
                            [10, 50],
                            [6, 80],
                            [8, 80],
                            [4, 80],
                        ],
                        { status: "completed" }
                    ),
                ]),
            ],
            "bench-press"
        );
        expect(session.bestWeight).toBe(80);
        expect(session.bestReps).toBe(8);
    });

    it("sums reps times weight as the session volume", () => {
        const [session] = buildExerciseHistory(
            [
                log("2026-01-01", [
                    exercise(
                        [
                            [10, 50],
                            [8, 60],
                        ],
                        { status: "completed" }
                    ),
                ]),
            ],
            "bench-press"
        );
        expect(session.volume).toBe(10 * 50 + 8 * 60);
    });

    it("keeps the status and uses null for legacy entries without one", () => {
        const history = buildExerciseHistory(
            [
                log("2026-01-01", [exercise([[5, 60]], { status: "failed" })]),
                log("2026-01-04", [exercise([[5, 60]])]),
            ],
            "bench-press"
        );
        expect(history.map((s) => s.status)).toEqual(["failed", null]);
    });

    it("uses the best reps when there is no weight (bodyweight)", () => {
        const [session] = buildExerciseHistory(
            [
                log("2026-01-01", [
                    exercise(
                        [
                            [8, 0],
                            [12, 0],
                            [10, 0],
                        ],
                        { refId: "pull-up", name: "Dominadas", status: "completed" }
                    ),
                ]),
            ],
            "pull-up"
        );
        expect(session.bestWeight).toBe(0);
        expect(session.bestReps).toBe(12);
        expect(session.volume).toBe(0);
    });

    it("keeps a skipped entry with no sets as an empty session", () => {
        const [session] = buildExerciseHistory(
            [log("2026-01-01", [exercise([], { status: "skipped" })])],
            "bench-press"
        );
        expect(session).toMatchObject({ bestWeight: 0, bestReps: 0, volume: 0, status: "skipped" });
    });

    it("ignores other exercises and other logs without the exercise", () => {
        const history = buildExerciseHistory(
            [
                log("2026-01-01", [exercise([[5, 100]], { refId: "back-squat", name: "Sentadilla con barra" })]),
                log("2026-01-04", [exercise([[5, 60]], { status: "completed" })]),
            ],
            "bench-press"
        );
        expect(history).toHaveLength(1);
        expect(history[0].date).toBe("2026-01-04");
    });

    it("merges two entries of the same exercise in one log into one session", () => {
        const [session, ...rest] = buildExerciseHistory(
            [
                log("2026-01-01", [
                    exercise([[5, 60]], { status: "failed" }),
                    exercise([[5, 70]], { status: "completed" }),
                ]),
            ],
            "bench-press"
        );
        expect(rest).toHaveLength(0);
        expect(session.bestWeight).toBe(70);
        expect(session.volume).toBe(5 * 60 + 5 * 70);
        expect(session.status).toBe("completed");
    });

    it("matches legacy entries without a ref through the catalog name", () => {
        const history = buildExerciseHistory(
            [log("2026-01-01", [exercise([[5, 60]], { refId: null })])],
            "bench-press"
        );
        expect(history).toHaveLength(1);
    });

    it("matches a free text legacy exercise by its raw name or its exercise id", () => {
        const legacy = exercise([[5, 20]], { refId: null, id: "x1", name: "Remo raro" });
        const logs = [log("2026-01-01", [legacy])];
        expect(buildExerciseHistory(logs, "Remo raro")).toHaveLength(1);
        expect(buildExerciseHistory(logs, "x1")).toHaveLength(1);
        expect(buildExerciseHistory(logs, "other")).toHaveLength(0);
    });

    it("returns an empty history for no logs", () => {
        expect(buildExerciseHistory([], "bench-press")).toEqual([]);
    });
});

describe("exerciseHistoryKey", () => {
    it("uses the ref id when there is one", () => {
        expect(
            exerciseHistoryKey({
                exercise: { id: "row", name: "Press banca" },
                ref: { source: "custom", id: "uuid-1" },
            })
        ).toBe("uuid-1");
    });

    it("resolves a legacy name to its catalog id", () => {
        expect(exerciseHistoryKey({ exercise: { id: "row", name: "Press banca" } })).toBe("bench-press");
    });

    it("falls back to the exercise id for free text names", () => {
        expect(exerciseHistoryKey({ exercise: { id: "row-9", name: "Remo raro" } })).toBe("row-9");
    });
});

describe("findPersonalRecord", () => {
    it("returns the heaviest session with its reps, the earliest one on a tie", () => {
        const record = findPersonalRecord([
            { date: "2026-01-01", logId: "a", bestWeight: 60, bestReps: 5, volume: 300, status: "completed" },
            { date: "2026-01-08", logId: "b", bestWeight: 80, bestReps: 3, volume: 240, status: "completed" },
            { date: "2026-01-15", logId: "c", bestWeight: 80, bestReps: 6, volume: 480, status: "completed" },
        ]);
        expect(record).toEqual({ weight: 80, reps: 3, date: "2026-01-08" });
    });

    it("falls back to the most reps when nothing was ever weighted", () => {
        const record = findPersonalRecord([
            { date: "2026-01-01", logId: "a", bestWeight: 0, bestReps: 8, volume: 0, status: "completed" },
            { date: "2026-01-08", logId: "b", bestWeight: 0, bestReps: 12, volume: 0, status: "completed" },
        ]);
        expect(record).toEqual({ weight: 0, reps: 12, date: "2026-01-08" });
    });

    it("is null for an empty history or one without any logged set", () => {
        expect(findPersonalRecord([])).toBeNull();
        expect(
            findPersonalRecord([
                { date: "2026-01-01", logId: "a", bestWeight: 0, bestReps: 0, volume: 0, status: "skipped" },
            ])
        ).toBeNull();
    });
});

describe("buildProgressSeries", () => {
    it("plots the best weight of each session that logged a weight", () => {
        const series = buildProgressSeries([
            { date: "2026-01-01", logId: "a", bestWeight: 60, bestReps: 5, volume: 300, status: "completed" },
            { date: "2026-01-04", logId: "b", bestWeight: 0, bestReps: 0, volume: 0, status: "skipped" },
            { date: "2026-01-08", logId: "c", bestWeight: 62.5, bestReps: 5, volume: 312.5, status: "failed" },
        ]);
        expect(series).toEqual({
            metric: "weight",
            points: [
                { date: "2026-01-01", value: 60 },
                { date: "2026-01-08", value: 62.5 },
            ],
        });
    });

    it("plots the best reps when the exercise never carried weight", () => {
        const series = buildProgressSeries([
            { date: "2026-01-01", logId: "a", bestWeight: 0, bestReps: 8, volume: 0, status: "completed" },
            { date: "2026-01-08", logId: "b", bestWeight: 0, bestReps: 10, volume: 0, status: "completed" },
        ]);
        expect(series).toEqual({
            metric: "reps",
            points: [
                { date: "2026-01-01", value: 8 },
                { date: "2026-01-08", value: 10 },
            ],
        });
    });

    it("has no points for an empty history", () => {
        expect(buildProgressSeries([])).toEqual({ metric: "weight", points: [] });
    });
});
