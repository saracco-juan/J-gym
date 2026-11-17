"use client";

/**
 * useWeekSwap — state of the "Esta semana" panel: the current week with each
 * date's routine, and the swap / reset actions. The rules are pure, in core
 * (`swapBlock`, `resetBlock`); reads and writes go through local queries.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { swapBlock, toLocalDateStr, type SwapBlockReason } from "@/core/schedule";
import {
    getLocalRepositories,
    subscribeLocalWrites,
} from "@/infrastructure/local/localRepositories";
import {
    loadWeekPlan,
    resetWeek,
    swapDays,
    type SwapResult,
    type WeekPlan,
    type WeekPlanDay,
} from "@/infrastructure/local/queries";
import { useSyncStore } from "@/presentation/stores/useSyncStore";

/** Short reason shown next to a day that cannot be swapped. */
export const SWAP_BLOCK_LABELS: Record<SwapBlockReason, string> = {
    "same-day": "Es el mismo día",
    "other-week": "No es de esta semana",
    past: "Ya pasó",
    logged: "Ya entrenaste ese día",
    "rest-day": "Día de descanso",
    "session-in-progress": "Tenés un entrenamiento en curso",
};

export interface SwapOption {
    day: WeekPlanDay;
    blocked: SwapBlockReason | null;
}

export function useWeekSwap() {
    const userId = useSyncStore((s) => s.userId);
    const [plan, setPlan] = useState<WeekPlan | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [source, setSource] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    const reload = useCallback(async () => {
        if (!userId) return;
        try {
            setPlan(await loadWeekPlan(getLocalRepositories(), userId, toLocalDateStr(new Date())));
            setLoadError(false);
        } catch {
            setLoadError(true);
        }
    }, [userId]);

    useEffect(() => {
        void reload();
        // Saving the routine can turn a day into a rest day or back.
        return subscribeLocalWrites(() => void reload());
    }, [reload]);

    /** Swap targets for each date, with the reason a target is blocked. */
    const optionsFor = useCallback(
        (date: string): SwapOption[] =>
            plan
                ? plan.days
                      .filter((d) => d.date !== date)
                      .map((day) => ({ day, blocked: swapBlock({ ...plan.swapContext, a: date, b: day.date }) }))
                : [],
        [plan]
    );

    /** Dates that have at least one allowed swap. */
    const swappable = useMemo(
        () =>
            new Set(
                (plan?.days ?? [])
                    .filter((d) => optionsFor(d.date).some((o) => o.blocked === null))
                    .map((d) => d.date)
            ),
        [plan, optionsFor]
    );

    const run = useCallback(
        async (write: (userId: string, today: string) => Promise<SwapResult>) => {
            if (!userId) return;
            setIsBusy(true);
            setActionError(null);
            try {
                const result = await write(userId, toLocalDateStr(new Date()));
                if (!result.ok) setActionError(SWAP_BLOCK_LABELS[result.reason]);
                setSource(null);
                await reload();
            } catch {
                setActionError("No se pudo guardar el cambio. Probá de nuevo.");
            } finally {
                setIsBusy(false);
            }
        },
        [userId, reload]
    );

    const swapWith = useCallback(
        (target: string) => {
            if (!source) return;
            void run((uid, today) => swapDays(getLocalRepositories(), uid, today, source, target));
        },
        [source, run]
    );

    const reset = useCallback(
        () => void run((uid, today) => resetWeek(getLocalRepositories(), uid, today)),
        [run]
    );

    return {
        plan,
        loadError,
        actionError,
        isBusy,
        swappable,
        source: plan?.days.find((d) => d.date === source) ?? null,
        sourceOptions: source ? optionsFor(source) : [],
        actions: { open: setSource, close: () => setSource(null), swapWith, reset },
    };
}
