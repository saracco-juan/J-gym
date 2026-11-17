import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseLeaderboardSource } from "../supabaseLeaderboardSource";

type Reply = { data: unknown[] | null; error: { message: string; code?: string } | null; status: number };

function fakeClient(replies: Record<string, Reply | Error>) {
    const selected: string[] = [];
    const client = {
        from(table: string) {
            return {
                select(columns: string) {
                    selected.push(`${table}:${columns}`);
                    const reply = replies[table];
                    if (reply instanceof Error) return Promise.reject(reply);
                    return Promise.resolve(reply);
                },
            };
        },
    } as unknown as SupabaseClient;
    return { client, selected };
}

describe("createSupabaseLeaderboardSource", () => {
    it("selects every row of public_stats and of profiles", async () => {
        const { client, selected } = fakeClient({
            public_stats: { data: [{ user_id: "u1" }], error: null, status: 200 },
            profiles: { data: [{ user_id: "u1" }, { user_id: "u2" }], error: null, status: 200 },
        });
        const source = createSupabaseLeaderboardSource(client);

        expect(await source.fetchStatsRows()).toEqual([{ user_id: "u1" }]);
        expect(await source.fetchProfileRows()).toHaveLength(2);
        expect(selected).toEqual(["public_stats:*", "profiles:*"]);
    });

    it("returns an empty list for a null result", async () => {
        const { client } = fakeClient({ public_stats: { data: null, error: null, status: 200 } });
        expect(await createSupabaseLeaderboardSource(client).fetchStatsRows()).toEqual([]);
    });

    it("throws the server message when the query fails", async () => {
        const { client } = fakeClient({
            public_stats: { data: null, error: { message: "relation does not exist", code: "42P01" }, status: 404 },
        });
        await expect(createSupabaseLeaderboardSource(client).fetchStatsRows()).rejects.toThrow(
            "relation does not exist"
        );
    });

    it("throws when the request itself rejects", async () => {
        const { client } = fakeClient({ profiles: new Error("Failed to fetch") });
        await expect(createSupabaseLeaderboardSource(client).fetchProfileRows()).rejects.toThrow(
            "Failed to fetch"
        );
    });
});
