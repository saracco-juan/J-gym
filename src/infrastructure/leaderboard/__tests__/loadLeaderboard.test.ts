import { LEADERBOARD_CACHE_KEY, loadLeaderboard, type LeaderboardSource } from "../loadLeaderboard";

class FakeMeta {
    store = new Map<string, unknown>();
    async get<T = unknown>(key: string): Promise<T | undefined> {
        return this.store.get(key) as T | undefined;
    }
    async set(key: string, value: unknown): Promise<void> {
        this.store.set(key, value);
    }
}

const profileRows = [
    { user_id: "u1", display_name: "Ana", avatar_color: "#2563eb" },
    { user_id: "u2", display_name: "Beto", avatar_color: "#db2777" },
];
const statsRows = [
    { user_id: "u1", streak: 4, level: 2, xp: 150, week_start: "2026-11-16", month: "2026-11-01" },
    { user_id: "u3", streak: 9, level: 5, xp: 1200, week_start: "2026-11-16", month: "2026-11-01" },
];

function source(overrides: Partial<LeaderboardSource> = {}): LeaderboardSource {
    return {
        fetchProfileRows: async () => profileRows,
        fetchStatsRows: async () => statsRows,
        ...overrides,
    };
}

describe("loadLeaderboard", () => {
    it("joins both tables on the client and leaves out users without a profile", async () => {
        const meta = new FakeMeta();
        const result = await loadLeaderboard({ source: source(), meta, now: () => 5000 });

        expect(result.source).toBe("network");
        expect(result.fetchedAt).toBe(5000);
        expect(result.entries.map((e) => e.profile.userId)).toEqual(["u1"]);
        expect(result.entries[0].stats.streak).toBe(4);
        expect(result.entries[0].profile.displayName).toBe("Ana");
    });

    it("caches the last successful result", async () => {
        const meta = new FakeMeta();
        await loadLeaderboard({ source: source(), meta, now: () => 5000 });
        expect(meta.store.get(LEADERBOARD_CACHE_KEY)).toMatchObject({ fetchedAt: 5000 });
    });

    it("falls back to the cache when the server cannot be reached", async () => {
        const meta = new FakeMeta();
        await loadLeaderboard({ source: source(), meta, now: () => 5000 });

        const offline = source({
            fetchStatsRows: async () => {
                throw new Error("Failed to fetch");
            },
        });
        const result = await loadLeaderboard({ source: offline, meta, now: () => 9000 });

        expect(result.source).toBe("cache");
        expect(result.fetchedAt).toBe(5000);
        expect(result.entries.map((e) => e.profile.userId)).toEqual(["u1"]);
    });

    it("goes straight to the cache without asking the server while offline", async () => {
        const meta = new FakeMeta();
        await loadLeaderboard({ source: source(), meta, now: () => 5000 });
        const fetchStatsRows = jest.fn(async () => statsRows);

        const result = await loadLeaderboard({
            source: source({ fetchStatsRows }),
            meta,
            now: () => 9000,
            isOnline: () => false,
        });

        expect(fetchStatsRows).not.toHaveBeenCalled();
        expect(result.source).toBe("cache");
    });

    it("throws when the server fails and there is no cache", async () => {
        const failing = source({
            fetchProfileRows: async () => {
                throw new Error("boom");
            },
        });
        await expect(loadLeaderboard({ source: failing, meta: new FakeMeta(), now: () => 1 })).rejects.toThrow(
            "boom"
        );
    });

    it("throws offline with no cache", async () => {
        await expect(
            loadLeaderboard({ source: source(), meta: new FakeMeta(), now: () => 1, isOnline: () => false })
        ).rejects.toThrow();
    });

    it("keeps the cache untouched when a refresh fails", async () => {
        const meta = new FakeMeta();
        await loadLeaderboard({ source: source(), meta, now: () => 5000 });
        const failing = source({
            fetchProfileRows: async () => {
                throw new Error("boom");
            },
        });
        await loadLeaderboard({ source: failing, meta, now: () => 9000 });
        expect(meta.store.get(LEADERBOARD_CACHE_KEY)).toMatchObject({ fetchedAt: 5000 });
    });

    it("ignores a corrupt cache", async () => {
        const meta = new FakeMeta();
        meta.store.set(LEADERBOARD_CACHE_KEY, { nonsense: true });
        const failing = source({
            fetchProfileRows: async () => {
                throw new Error("boom");
            },
        });
        await expect(loadLeaderboard({ source: failing, meta, now: () => 1 })).rejects.toThrow("boom");
    });

    it("returns an empty board when nobody published yet", async () => {
        const result = await loadLeaderboard({
            source: source({ fetchStatsRows: async () => [] }),
            meta: new FakeMeta(),
            now: () => 1,
        });
        expect(result.entries).toEqual([]);
    });
});
