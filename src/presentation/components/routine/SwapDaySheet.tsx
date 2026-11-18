"use client";

/**
 * SwapDaySheet — picks the day of this week to swap routines with.
 * Blocked days stay visible, disabled, with the reason. Presentational.
 */

import { weekdayLabel } from "@/core/routine";
import type { WeekPlanDay } from "@/infrastructure/local/queries";
import BottomSheet from "@/presentation/components/ui/BottomSheet";
import { SWAP_BLOCK_LABELS, type SwapOption } from "./useWeekSwap";

interface SwapDaySheetProps {
    source: WeekPlanDay;
    options: readonly SwapOption[];
    isBusy: boolean;
    onSelect: (date: string) => void;
    onClose: () => void;
}

/** "Rutina del martes" or "Descanso". */
export function routineCaption(day: WeekPlanDay): string {
    return day.exerciseCount === 0 ? "Descanso" : `Rutina del ${day.dayName}`;
}

export default function SwapDaySheet({ source, options, isBusy, onSelect, onClose }: SwapDaySheetProps) {
    return (
        <BottomSheet title={`Intercambiar ${weekdayLabel(source.naturalDayName)}`} onClose={onClose}>
            <p className="body-6 text-text-secondary">
                Elegí con qué día cambiar la rutina, también puede ser un día de descanso. Solo vale
                para esta semana.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
                {options.map(({ day, blocked }) => (
                    <li key={day.date}>
                        <button
                            type="button"
                            onClick={() => onSelect(day.date)}
                            disabled={blocked !== null || isBusy}
                            className="btn-secondary button-md w-full flex-col items-start gap-0.5 text-left"
                        >
                            <span>{weekdayLabel(day.naturalDayName)}</span>
                            <span className="caption-5 text-text-muted">
                                {blocked ? SWAP_BLOCK_LABELS[blocked] : routineCaption(day)}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </BottomSheet>
    );
}
