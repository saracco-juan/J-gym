"use client";

/**
 * RoutineTypeSelector — Paso 2 del onboarding.
 *
 * El usuario elige entre una rutina predefinida de gimnasio
 * o crear su propia rutina desde cero.
 */

import { Barbell, PencilSimple } from "@phosphor-icons/react";
import { DEFAULT_ROUTINES } from "@/core/constants/defaultRoutines";

interface RoutineTypeSelectorProps {
    selected: "default" | "custom" | null;
    onSelect: (type: "default" | "custom") => void;
}

export default function RoutineTypeSelector({
    selected,
    onSelect,
}: RoutineTypeSelectorProps) {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="heading-6 text-text-primary">
                    ¿Qué tipo de rutina querés?
                </h2>
                <p className="body-6 mt-1 text-text-muted">
                    Podés empezar con una base o armar la tuya desde cero.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {/* Opción A: Rutina de gimnasio por defecto */}
                <button
                    type="button"
                    onClick={() => onSelect("default")}
                    aria-pressed={selected === "default"}
                    className={`pressable flex flex-col items-start gap-2 rounded-2xl border p-4 text-left ${selected === "default"
                        ? "border-accent-hover bg-accent-soft"
                        : "border-surface-border bg-surface-raised hover:border-text-muted"
                        }`}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <Barbell size={24} weight="bold" className="text-accent-text" />
                        <span className="title-3 text-text-primary">
                            Rutina de gimnasio
                        </span>
                        <span className="caption-3 rounded-full bg-accent-soft px-2 py-0.5 text-accent-text">
                            Recomendado
                        </span>
                    </div>
                    <p className="body-6 text-text-secondary">
                        {DEFAULT_ROUTINES[0].description}
                        Vos ponés tus marcas iniciales.
                    </p>
                </button>

                {/* Opción B: Personalizada */}
                <button
                    type="button"
                    onClick={() => onSelect("custom")}
                    aria-pressed={selected === "custom"}
                    className={`pressable flex flex-col items-start gap-2 rounded-2xl border p-4 text-left ${selected === "custom"
                        ? "border-accent-hover bg-accent-soft"
                        : "border-surface-border bg-surface-raised hover:border-text-muted"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <PencilSimple size={24} weight="bold" className="text-text-secondary" />
                        <span className="title-3 text-text-primary">
                            Crear mi propia rutina
                        </span>
                    </div>
                    <p className="body-6 text-text-secondary">
                        Definí tus propios ejercicios, series y repeticiones
                        para cada día de entrenamiento.
                    </p>
                </button>
            </div>
        </div>
    );
}
