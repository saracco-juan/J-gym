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
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
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
                    type="button"
                    onClick={goPrev}
                    className="btn-icon bg-surface-overlay"
                    aria-label="Semana anterior"
                >
                    <CaretLeft size={24} weight="bold" />
                </button>

                <span className="body-4 text-text-primary capitalize">
                    {monthLabel}
                </span>

                <button
                    type="button"
                    onClick={goNext}
                    className="btn-icon bg-surface-overlay"
                    aria-label="Semana siguiente"
                >
                    <CaretRight size={24} weight="bold" />
                </button>
            </div>

            {/* Days row */}
            <div className="flex gap-2">
                {weekDays.map(({ label, dateStr, dayNum }) => {
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;

                    return (
                        <button
                            key={dateStr}
                            type="button"
                            onClick={() => onSelectDate(dateStr)}
                            className={`pressable flex h-16 min-w-0 flex-1 flex-col items-center justify-center rounded-xl border ${isSelected
                                    ? "border-accent bg-accent text-text-primary"
                                    : isToday
                                        ? "border-accent-border bg-surface-overlay text-accent-text hover:bg-surface-strong"
                                        : "border-surface-border bg-surface-raised text-text-muted hover:bg-surface-strong hover:text-text-primary"
                                }`}
                            aria-label={`${label} ${dayNum}`}
                            aria-pressed={isSelected}
                            aria-current={isToday ? "date" : undefined}
                        >
                            <span className="caption-3 tracking-wider">
                                {label}
                            </span>
                            <span className="title-2">
                                {dayNum}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
