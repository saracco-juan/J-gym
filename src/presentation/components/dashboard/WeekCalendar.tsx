"use client";

/**
 * WeekCalendar — Selector horizontal de 7 días con navegación por semanas.
 *
 * - Flechas izq/der para cambiar de semana (date-fns: addWeeks/subWeeks).
 * - Resalta el día actual y el día seleccionado.
 * - Muestra Mes/Año en la cabecera.
 * - Mobile-first: botones grandes, scroll horizontal.
 */

import { useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    startOfWeek,
    addDays,
    addWeeks,
    subWeeks,
    format,
} from "date-fns";
import { es } from "date-fns/locale";

interface WeekCalendarProps {
    activeWeek: Date;
    selectedDate: string;
    onSelectDate: (date: string) => void;
    onChangeWeek: (newWeek: Date) => void;
}

const DAY_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function WeekCalendar({
    activeWeek,
    selectedDate,
    onSelectDate,
    onChangeWeek,
}: WeekCalendarProps) {
    const monday = useMemo(
        () => startOfWeek(activeWeek, { weekStartsOn: 1 }),
        [activeWeek]
    );

    const weekDays = useMemo(
        () =>
            DAY_LABELS.map((label, i) => {
                const d = addDays(monday, i);
                return { label, date: d, dateStr: toDateStr(d), dayNum: d.getDate() };
            }),
        [monday]
    );

    const todayStr = useMemo(() => toDateStr(new Date()), []);

    const monthLabel = useMemo(
        () => format(monday, "MMMM yyyy", { locale: es }),
        [monday]
    );

    const goPrev = useCallback(
        () => onChangeWeek(subWeeks(activeWeek, 1)),
        [activeWeek, onChangeWeek]
    );
    const goNext = useCallback(
        () => onChangeWeek(addWeeks(activeWeek, 1)),
        [activeWeek, onChangeWeek]
    );

    return (
        <div className="flex flex-col gap-2 px-4 py-3">
            {/* Header: Mes/Año + flechas */}
            <div className="flex items-center justify-between">
                <button
                    onClick={goPrev}
                    className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 active:scale-95 transition-all"
                    aria-label="Semana anterior"
                >
                    <ChevronLeft size={18} />
                </button>

                <span className="text-sm font-semibold text-white capitalize">
                    {monthLabel}
                </span>

                <button
                    onClick={goNext}
                    className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 active:scale-95 transition-all"
                    aria-label="Semana siguiente"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Days row */}
            <div className="flex gap-1.5">
                {weekDays.map(({ label, dateStr, dayNum }) => {
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;

                    return (
                        <button
                            key={dateStr}
                            onClick={() => onSelectDate(dateStr)}
                            className={`flex-1 flex flex-col items-center justify-center h-16 rounded-xl transition-all ${isSelected
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                                    : isToday
                                        ? "bg-zinc-800 text-emerald-400 border border-emerald-700/50"
                                        : "bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                                }`}
                            aria-label={`${label} ${dayNum}`}
                            aria-pressed={isSelected}
                        >
                            <span className="text-[10px] font-semibold tracking-wider">
                                {label}
                            </span>
                            <span className={`text-lg font-bold ${isSelected ? "text-white" : ""}`}>
                                {dayNum}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
