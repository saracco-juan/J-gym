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
                <h2 className="heading-6 text-text-primary">¿Qué días entrenás?</h2>
                <p className="body-6 mt-1 text-text-muted">
                    Seleccioná los días de la semana que vas al gimnasio.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {DAYS.map(({ key, label, short }) => {
                    const isSelected = selectedDays.includes(key);
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onToggle(key)}
                            aria-pressed={isSelected}
                            className={`pressable button-md min-h-12 rounded-xl border px-3 py-2 ${isSelected
                                    ? "border-accent bg-accent text-text-primary hover:bg-accent-hover"
                                    : "border-surface-border bg-surface-raised text-text-secondary hover:border-text-muted"
                                }`}
                        >
                            <span className="hidden sm:inline">{label}</span>
                            <span className="sm:hidden">{short}</span>
                        </button>
                    );
                })}
            </div>

            {selectedDays.length > 0 && (
                <p className="caption-5 text-center text-text-muted">
                    {selectedDays.length} día{selectedDays.length !== 1 ? "s" : ""} seleccionado{selectedDays.length !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}
