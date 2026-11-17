"use client";

/**
 * DashboardClient — Client Component principal del dashboard.
 *
 * Mantiene estados: activeWeek + selectedDate.
 * Coordina WeekCalendar + RoutineSummary.
 * Redirige a /onboarding si el usuario no tiene rutinas.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { startOfWeek } from "date-fns";
import WeekCalendar from "./WeekCalendar";
import RoutineSummary from "./RoutineSummary";
import DashboardSkeleton, { ExerciseListSkeleton } from "./DashboardSkeleton";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { hasRoutines, isDayLocked, loadDayData } from "@/infrastructure/local/queries";
import type { DayDataResult } from "@/infrastructure/local/queries";
import { waitForFirstPull } from "@/infrastructure/sync/syncRuntime";
import { useSyncStore } from "@/presentation/stores/useSyncStore";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";
import type { IRoutineTemplate } from "@/core/domain/routine-template";
import { getDailyQuote } from "@/core/constants/quotes";
import { Moon } from "@phosphor-icons/react";

// ─── Helpers ───────────────────────────────────────────────────────

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getTodayStr(): string {
    return toDateStr(new Date());
}

function isDateToday(dateStr: string): boolean {
    return dateStr === getTodayStr();
}

function isDateInPast(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr + "T00:00:00") < today;
}

function getMondayStr(week: Date): string {
    return toDateStr(startOfWeek(week, { weekStartsOn: 1 }));
}

// ─── Component ─────────────────────────────────────────────────────

export default function DashboardClient() {
    const router = useRouter();
    const startWorkout = useWorkoutStore((s) => s.startWorkout);
    // undefined while resolving, null when signed out. Read from local storage:
    // no network round trip is needed to render cached data.
    const userId = useSyncStore((s) => s.userId);

    const [activeWeek, setActiveWeek] = useState<Date>(() => new Date());
    const [selectedDate, setSelectedDate] = useState(getTodayStr);
    const [dayData, setDayData] = useState<DayDataResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

    // ─── Onboarding check ────────────────────────────────────

    useEffect(() => {
        if (userId === undefined) return;
        if (userId === null) {
            router.replace("/login");
            return;
        }
        let cancelled = false;
        async function check(id: string) {
            const repos = getLocalRepositories();
            let has = await hasRoutines(repos, id);
            if (!has) {
                // New device: the server may already hold this user's routines.
                await waitForFirstPull(id);
                has = await hasRoutines(repos, id);
            }
            if (cancelled) return;
            if (!has) {
                router.replace("/onboarding");
                return;
            }
            setIsCheckingOnboarding(false);
        }
        void check(userId);
        return () => {
            cancelled = true;
        };
    }, [router, userId]);

    // ─── Read data on date change (local database) ───────────

    useEffect(() => {
        if (isCheckingOnboarding || !userId) return;

        let cancelled = false;
        const repos = getLocalRepositories();
        loadDayData(repos, userId, selectedDate, getTodayStr()).then((result) => {
            if (cancelled) return;
            setDayData(result);
            setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [selectedDate, isCheckingOnboarding, userId]);

    // ─── Week navigation ────────────────────────────────────

    const handleSelectDate = useCallback((dateStr: string) => {
        setIsLoading(true);
        setSelectedDate(dateStr);
    }, []);

    const handleChangeWeek = useCallback((newWeek: Date) => {
        setActiveWeek(newWeek);
        // Auto-select Monday of the new week
        handleSelectDate(getMondayStr(newWeek));
    }, [handleSelectDate]);

    // ─── Start workout ──────────────────────────────────────

    const handleStartWorkout = useCallback(
        async (template: IRoutineTemplate) => {
            if (!userId) return;
            const repos = getLocalRepositories();
            // The day may have been finished since this screen loaded (another
            // tab, a synced device): never start a second workout for it.
            if (await isDayLocked(repos, userId, getTodayStr())) {
                setDayData(await loadDayData(repos, userId, selectedDate, getTodayStr()));
                return;
            }
            // An unfinished session of this routine is resumed, never overwritten.
            const saved = await repos.activeSession.get(userId);
            const resumable = saved?.meta?.templateId === template.id && saved.meta.date === getTodayStr();
            if (!resumable) {
                startWorkout(template, userId);
            }
            router.push("/workout");
        },
        [startWorkout, router, userId, selectedDate]
    );

    // ─── Loading ─────────────────────────────────────────────

    if (isCheckingOnboarding) {
        return <DashboardSkeleton />;
    }

    // ─── Render ──────────────────────────────────────────────

    const isPast = isDateInPast(selectedDate);
    const isToday = isDateToday(selectedDate);

    return (
        <div className="flex flex-col gap-4">
            <WeekCalendar
                activeWeek={activeWeek}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onChangeWeek={handleChangeWeek}
            />

            {/* Daily motivational quote */}
            <div className="mx-4 rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="body-6 text-text-secondary">
                    &ldquo;{getDailyQuote()}&rdquo;
                </p>
            </div>

            <div className="px-4">
                <h2 className="heading-6 text-text-primary">
                    {isToday ? "Hoy" : isPast ? "Registro" : "Plan"}
                </h2>
                <p className="caption-5 text-text-muted">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-AR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                    })}
                </p>
            </div>

            <div className="px-4 pb-8">
                {isLoading ? (
                    <ExerciseListSkeleton />
                ) : !dayData || dayData.type === "empty" ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <div className="flex size-16 items-center justify-center rounded-xl border border-surface-border bg-surface-raised">
                            <Moon size={32} weight="bold" className="text-text-muted" />
                        </div>
                        <h3 className="title-2 text-text-primary">
                            {isPast ? "Sin registro" : "Día de descanso"}
                        </h3>
                        <p className="body-6 max-w-xs text-text-secondary">
                            {isPast ? "No se entrenó este día." : "No hay rutina asignada para este día."}
                        </p>
                    </div>
                ) : dayData.type === "error" ? (
                    <div role="alert" className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3">
                        <p className="body-6 text-danger-text">{dayData.error}</p>
                    </div>
                ) : dayData.type === "template" ? (
                    <div className="flex flex-col gap-4">
                        <RoutineSummary mode="template" template={dayData.data} />
                        {!isPast && (
                            <button
                                type="button"
                                onClick={() => handleStartWorkout(dayData.data)}
                                disabled={dayData.action === "future"}
                                className="btn-primary w-full button-md"
                            >
                                {dayData.action === "resume"
                                    ? "Continuar rutina"
                                    : dayData.action === "start"
                                        ? "Empezar rutina"
                                        : "Rutina futura"}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <RoutineSummary mode="log" log={dayData.data} />
                        {isToday && (
                            // Today's workout is finished: the day is locked.
                            <button type="button" disabled className="btn-primary w-full button-md">
                                Entrenamiento completado
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
