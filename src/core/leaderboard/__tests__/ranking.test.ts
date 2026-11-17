import type { IProfile } from "../../domain";
import { publicStatsFromRow } from "../../mappers";
import type { PublicStats } from "../../stats";
import { joinLeaderboard, normalizeStats, rankEntries } from "../ranking";

function stats(userId: string, patch: Partial<PublicStats> = {}): PublicStats {
    return {
        ...publicStatsFromRow({ user_id: userId }),
        weekStart: "2026-11-16",
        monthStart: "2026-11-01",
        ...patch,
    };
}

function profile(userId: string, displayName: string): IProfile {
    return { userId, displayName, avatarColor: "#059669" };
}

const TODAY = "2026-11-17";

describe("joinLeaderboard", () => {
    it("pairs each snapshot with its profile", () => {
        const entries = joinLeaderboard([profile("u1", "Ana")], [stats("u1", { streak: 4 })]);
        expect(entries).toHaveLength(1);
        expect(entries[0].profile.displayName).toBe("Ana");
        expect(entries[0].stats.streak).toBe(4);
    });

    it("leaves out users without a profile", () => {
        const entries = joinLeaderboard([profile("u1", "Ana")], [stats("u1"), stats("u2")]);
        expect(entries.map((e) => e.profile.userId)).toEqual(["u1"]);
    });

    it("leaves out profiles that never published stats", () => {
        const entries = joinLeaderboard(
            [profile("u1", "Ana"), profile("u2", "Beto")],
            [stats("u1")]
        );
        expect(entries.map((e) => e.profile.userId)).toEqual(["u1"]);
    });

    it("is empty when nobody published", () => {
        expect(joinLeaderboard([profile("u1", "Ana")], [])).toEqual([]);
    });
});

describe("normalizeStats", () => {
    it("zeroes the weekly volume of a past week", () => {
        const old = stats("u1", { weeklyVolumeKg: 900, weekStart: "2026-11-09" });
        expect(normalizeStats(old, TODAY).weeklyVolumeKg).toBe(0);
    });

    it("keeps the weekly volume of the current week", () => {
        const current = stats("u1", { weeklyVolumeKg: 900, weekStart: "2026-11-16" });
        expect(normalizeStats(current, "2026-11-22").weeklyVolumeKg).toBe(900);
        expect(normalizeStats(current, "2026-11-23").weeklyVolumeKg).toBe(0);
    });

    it("zeroes the monthly progress of a past month", () => {
        const old = stats("u1", { monthlyProgressPct: 5, monthStart: "2026-10-01" });
        expect(normalizeStats(old, TODAY).monthlyProgressPct).toBe(0);
        expect(
            normalizeStats({ ...old, monthStart: "2026-11-01" }, TODAY).monthlyProgressPct
        ).toBe(5);
    });

    it("does not zero a snapshot from a clock slightly ahead", () => {
        const ahead = stats("u1", { weeklyVolumeKg: 300, weekStart: "2026-11-23" });
        expect(normalizeStats(ahead, TODAY).weeklyVolumeKg).toBe(300);
    });

    it("keeps the other fields and does not mutate the input", () => {
        const input = stats("u1", { streak: 3, weeklyVolumeKg: 10, weekStart: "2026-11-02" });
        const out = normalizeStats(input, TODAY);
        expect(out.streak).toBe(3);
        expect(input.weeklyVolumeKg).toBe(10);
    });
});

describe("rankEntries", () => {
    const entries = joinLeaderboard(
        [profile("a", "Ana"), profile("b", "Beto"), profile("c", "Caro"), profile("d", "Dani")],
        [
            stats("a", { streak: 5, weeklyVolumeKg: 1000, monthlyProgressPct: 2 }),
            stats("b", { streak: 9, weeklyVolumeKg: 3000, monthlyProgressPct: -1 }),
            stats("c", { streak: 5, weeklyVolumeKg: 2000, monthlyProgressPct: 7.5 }),
            stats("d", { streak: 0, weeklyVolumeKg: 0, monthlyProgressPct: 0 }),
        ]
    );

    it("orders by the value of the tab, highest first", () => {
        expect(
            rankEntries(entries, "weekly-volume", TODAY).map((r) => r.entry.profile.userId)
        ).toEqual(["b", "c", "a", "d"]);
        expect(rankEntries(entries, "monthly-progress", TODAY).map((r) => r.value)).toEqual([
            7.5, 2, 0, -1,
        ]);
    });

    it("gives tied entries the same position and skips the next ones", () => {
        const ranked = rankEntries(entries, "streak", TODAY);
        expect(ranked.map((r) => [r.entry.profile.userId, r.position])).toEqual([
            ["b", 1],
            ["a", 2],
            ["c", 2],
            ["d", 4],
        ]);
    });

    it("breaks ties by name so the order is stable", () => {
        const swapped = [entries[2], entries[0]];
        expect(
            rankEntries(swapped, "streak", TODAY).map((r) => r.entry.profile.displayName)
        ).toEqual(["Ana", "Caro"]);
    });

    it("ranks everybody 1 when all values are equal", () => {
        const flat = joinLeaderboard(
            [profile("a", "Ana"), profile("b", "Beto")],
            [stats("a"), stats("b")]
        );
        expect(rankEntries(flat, "streak", TODAY).map((r) => r.position)).toEqual([1, 1]);
    });

    it("ranks the weekly volume after normalizing stale weeks to zero", () => {
        const stale = joinLeaderboard(
            [profile("a", "Ana"), profile("b", "Beto")],
            [
                stats("a", { weeklyVolumeKg: 5000, weekStart: "2026-11-02" }),
                stats("b", { weeklyVolumeKg: 100 }),
            ]
        );
        const ranked = rankEntries(stale, "weekly-volume", TODAY);
        expect(ranked.map((r) => [r.entry.profile.userId, r.value, r.position])).toEqual([
            ["b", 100, 1],
            ["a", 0, 2],
        ]);
    });

    it("returns an empty list for no entries", () => {
        expect(rankEntries([], "streak", TODAY)).toEqual([]);
    });
});
