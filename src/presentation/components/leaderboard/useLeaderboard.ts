"use client";

/**
 * useLeaderboard: loads the board on mount and again on retry. The load
 * itself falls back to the local cache (see `loadLeaderboard`), so "error"
 * means there was neither a connection nor a cached board.
 *
 * `today` and `loadedAt` are captured when the result arrives, so rendering
 * stays pure and the stale week and month checks use the day it was read.
 */

import { useCallback, useEffect, useState } from "react";
import { toLocalDateStr } from "@/core/schedule";
import { fetchLeaderboard } from "@/infrastructure/leaderboard/leaderboardRuntime";
import type { LeaderboardResult } from "@/infrastructure/leaderboard/loadLeaderboard";

export type LeaderboardState =
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; result: LeaderboardResult; today: string; loadedAt: number };

export function useLeaderboard() {
    const [state, setState] = useState<LeaderboardState>({ status: "loading" });

    const run = useCallback(
        () =>
            fetchLeaderboard()
                .then((result) =>
                    setState({
                        status: "ready",
                        result,
                        today: toLocalDateStr(new Date()),
                        loadedAt: Date.now(),
                    })
                )
                .catch(() => setState({ status: "error" })),
        []
    );

    useEffect(() => {
        void run();
    }, [run]);

    const reload = useCallback(() => {
        setState({ status: "loading" });
        return run();
    }, [run]);

    return { state, reload };
}
