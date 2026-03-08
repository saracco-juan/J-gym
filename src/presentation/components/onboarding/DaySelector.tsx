"use client";

/**
 * DaySelector — Paso 1 del onboarding.
 *
 * El usuario selecciona los días de la semana que entrena
 * con botones toggle grandes mobile-first.
 */

interface DaySelectorProps {
    selectedDays: string[];
    onToggle: (day: string) => void;
}

const DAYS = [
    { key: "lunes", label: "Lunes", short: "LUN" },
    { key: "martes", label: "Martes", short: "MAR" },
    { key: "miércoles", label: "Miércoles", short: "MIÉ" },
    { key: "jueves", label: "Jueves", short: "JUE" },
    { key: "viernes", label: "Viernes", short: "VIE" },
    { key: "sábado", label: "Sábado", short: "SÁB" },
    { key: "domingo", label: "Domingo", short: "DOM" },
];

export default function DaySelector({ selectedDays, onToggle }: DaySelectorProps) {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-xl font-bold text-white">¿Qué días entrenás?</h2>
                <p className="text-sm text-zinc-500 mt-1">
                    Seleccioná los días de la semana que vas al gimnasio.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {DAYS.map(({ key, label, short }) => {
                    const isSelected = selectedDays.includes(key);
                    return (
                        <button
                            key={key}
                            onClick={() => onToggle(key)}
                            className={`h-14 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] ${isSelected
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500"
                                }`}
                        >
                            <span className="hidden sm:inline">{label}</span>
                            <span className="sm:hidden">{short}</span>
                        </button>
                    );
                })}
            </div>

            {selectedDays.length > 0 && (
                <p className="text-xs text-zinc-500 text-center">
                    {selectedDays.length} día{selectedDays.length !== 1 ? "s" : ""} seleccionado{selectedDays.length !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}
