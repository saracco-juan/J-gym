"use client";

/**
 * AddDaySheet — lists the weekdays that have no routine yet. Presentational.
 */

import { weekdayLabel } from "@/core/routine";
import BottomSheet from "@/presentation/components/ui/BottomSheet";

interface AddDaySheetProps {
    weekdays: readonly string[];
    onSelect: (dayName: string) => void;
    onClose: () => void;
}

export default function AddDaySheet({ weekdays, onSelect, onClose }: AddDaySheetProps) {
    return (
        <BottomSheet title="Agregar día" onClose={onClose}>
            <p className="body-6 text-text-secondary">Elige el día de la semana que quieres entrenar.</p>
            <ul className="mt-4 flex flex-col gap-2">
                {weekdays.map((dayName) => (
                    <li key={dayName}>
                        <button
                            type="button"
                            onClick={() => onSelect(dayName)}
                            className="btn-secondary button-md w-full justify-start"
                        >
                            {weekdayLabel(dayName)}
                        </button>
                    </li>
                ))}
            </ul>
        </BottomSheet>
    );
}
