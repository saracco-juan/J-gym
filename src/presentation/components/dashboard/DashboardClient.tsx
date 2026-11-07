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
import { fetchDayData, checkHasRoutines } from "@/app/actions/dashboardActions";
import type { DayDataResult } from "@/app/actions/dashboardActions";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";
import type { IRoutineTemplate } from "@/core/domain/routine-template";
import { getDailyQuote } from "@/core/constants/quotes";
import { Moon } from "lucide-react";

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

    const [activeWeek, setActiveWeek] = useState<Date>(() => new Date());
    const [selectedDate, setSelectedDate] = useState(getTodayStr);
    const [dayData, setDayData] = useState<DayDataResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

    // ─── Onboarding check ────────────────────────────────────

    useEffect(() => {
        async function check() {
            const result = await checkHasRoutines();
            if (!result.hasRoutines && !result.error) {
                router.replace("/onboarding");
                return;
            }
            setIsCheckingOnboarding(false);
        }
        check();
    }, [router]);

    // ─── Fetch data on date change ───────────────────────────

    useEffect(() => {
        if (isCheckingOnboarding) return;

        let cancelled = false;
        fetchDayData(selectedDate).then((result) => {
            if (cancelled) return;
            setDayData(result);
            setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [selectedDate, isCheckingOnboarding]);

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
        (template: IRoutineTemplate) => {
            startWorkout(template);
            router.push("/workout");
        },
        [startWorkout, router]
    );

    // ─── Loading ─────────────────────────────────────────────

    if (isCheckingOnboarding) {
        return (
            <div className="flex items-center justify-center py-32">
                <span className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
        );
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
            <div className="mx-4 rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3">
                <p className="text-sm text-zinc-400 italic leading-relaxed">
                    &ldquo;{getDailyQuote()}&rdquo;
                </p>
            </div>

            <div className="px-4">
                <h2 className="text-lg font-bold text-white">
                    {isToday ? "Hoy" : isPast ? "Registro" : "Plan"}
                </h2>
                <p className="text-xs text-zinc-500">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-AR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                    })}
                </p>
            </div>

            <div className="px-4 pb-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <span className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    </div>
                ) : !dayData || dayData.type === "empty" ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl">
                            <Moon size={24} className="text-zinc-500" />
                        </div>
                        <p className="text-sm text-zinc-500 text-center">
                            {isPast ? "No se entrenó este día." : "No hay rutina asignada para este día."}
                        </p>
                    </div>
                ) : dayData.type === "error" ? (
                    <div className="rounded-xl bg-red-900/20 border border-red-800/50 px-4 py-3">
                        <p className="text-sm text-red-300">{dayData.error}</p>
                    </div>
                ) : dayData.type === "template" ? (
                    <div className="flex flex-col gap-4">
                        <RoutineSummary mode="template" template={dayData.data} />
                        {(isToday || !isPast) && (
                            <button
                                onClick={() => handleStartWorkout(dayData.data)}
                                disabled={!isToday}
                                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white text-base transition-all shadow-lg shadow-emerald-900/30 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                {isToday ? "Empezar Rutina" : "Rutina futura"}
                            </button>
                        )}
                    </div>
                ) : (
                    <RoutineSummary mode="log" log={dayData.data} />
                )}
            </div>
        </div>
    );
}
