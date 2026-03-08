"use client";

/**
 * RoutineTypeSelector — Paso 2 del onboarding.
 *
 * El usuario elige entre una rutina predefinida de gimnasio
 * o crear su propia rutina desde cero.
 */

import { Dumbbell, Pencil } from "lucide-react";

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
                <h2 className="text-xl font-bold text-white">
                    ¿Qué tipo de rutina querés?
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                    Podés empezar con una base o armar la tuya desde cero.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {/* Opción A: Rutina de Gimnasio por defecto */}
                <button
                    onClick={() => onSelect("default")}
                    className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.98] ${selected === "default"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <Dumbbell size={24} className="text-emerald-400" />
                        <div>
                            <span className="text-base font-bold text-white">
                                Rutina de Gimnasio
                            </span>
                            <span className="ml-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                Recomendado
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-zinc-400">
                        Piernas/Hombros, Espalda/Bíceps, Pecho/Tríceps y más.
                        Vos ponés tus marcas iniciales.
                    </p>
                </button>

                {/* Opción B: Personalizada */}
                <button
                    onClick={() => onSelect("custom")}
                    className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.98] ${selected === "custom"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <Pencil size={24} className="text-zinc-300" />
                        <span className="text-base font-bold text-white">
                            Crear mi propia rutina
                        </span>
                    </div>
                    <p className="text-sm text-zinc-400">
                        Definí tus propios ejercicios, series y repeticiones
                        para cada día de entrenamiento.
                    </p>
                </button>
            </div>
        </div>
    );
}
