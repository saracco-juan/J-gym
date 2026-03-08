"use client";

/**
 * ExerciseSetup — Formulario de ejercicios del onboarding.
 *
 * Dos modos:
 * - Custom: nombres editables + agregar/eliminar ejercicios.
 * - Pre-loaded (preLoaded=true): nombres bloqueados, solo editar
 *   series/reps/peso. Ideal para la plantilla por defecto.
 */

import { useState, useCallback } from "react";

// ─── Tipos locales del wizard ──────────────────────────────────────

export interface WizardExercise {
    id: string;
    name: string;
    targetSets: number;
    targetReps: number;
    initialWeight: number;
}

export interface DayExercises {
    dayName: string;
    dayLabel?: string;
    exercises: WizardExercise[];
}

interface ExerciseSetupProps {
    days: DayExercises[];
    onUpdate: (days: DayExercises[]) => void;
    preLoaded?: boolean;
}

const DAY_LABELS: Record<string, string> = {
    lunes: "Lunes", martes: "Martes", miércoles: "Miércoles",
    jueves: "Jueves", viernes: "Viernes", sábado: "Sábado", domingo: "Domingo",
};

const inputCls = "h-10 rounded-lg bg-zinc-800 border border-zinc-700 px-2 text-center text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function ExerciseSetup({ days, onUpdate, preLoaded }: ExerciseSetupProps) {
    const [activeDay, setActiveDay] = useState(0);
    const currentDay = days[activeDay];

    const addExercise = useCallback(() => {
        const updated = [...days];
        updated[activeDay] = {
            ...currentDay,
            exercises: [
                ...currentDay.exercises,
                { id: crypto.randomUUID(), name: "", targetSets: 0, targetReps: 0, initialWeight: 0 },
            ],
        };
        onUpdate(updated);
    }, [days, activeDay, currentDay, onUpdate]);

    const updateExercise = useCallback(
        (index: number, field: keyof WizardExercise, value: string | number) => {
            const updated = [...days];
            const exercises = [...currentDay.exercises];
            exercises[index] = { ...exercises[index], [field]: value };
            updated[activeDay] = { ...currentDay, exercises };
            onUpdate(updated);
        },
        [days, activeDay, currentDay, onUpdate]
    );

    const removeExercise = useCallback(
        (index: number) => {
            const updated = [...days];
            const exercises = currentDay.exercises.filter((_, i) => i !== index);
            updated[activeDay] = { ...currentDay, exercises };
            onUpdate(updated);
        },
        [days, activeDay, currentDay, onUpdate]
    );

    const tabLabel = (day: DayExercises) =>
        day.dayLabel ?? DAY_LABELS[day.dayName] ?? day.dayName;

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-xl font-bold text-white">
                    {preLoaded ? "Completá tus marcas" : "Armá tu rutina"}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                    {preLoaded
                        ? "Ingresá series, repeticiones y peso para cada ejercicio."
                        : "Agregá ejercicios para cada día. El peso es opcional."}
                </p>
            </div>

            {/* Day tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
                {days.map((day, i) => {
                    const allFilled = day.exercises.every(
                        (e) => e.targetSets > 0 && e.targetReps > 0
                    );
                    return (
                        <button
                            key={day.dayName}
                            onClick={() => setActiveDay(i)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-all ${i === activeDay
                                    ? "bg-emerald-600 text-white"
                                    : "bg-zinc-800 text-zinc-400"
                                }`}
                        >
                            {tabLabel(day)}
                            {preLoaded && (
                                <span className={`ml-1 text-[10px] ${allFilled ? "text-emerald-300" : "text-amber-400"}`}>
                                    {allFilled ? "✓" : "●"}
                                </span>
                            )}
                            {!preLoaded && day.exercises.length > 0 && (
                                <span className="ml-1 text-[10px] opacity-70">({day.exercises.length})</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Exercise cards */}
            <div className="flex flex-col gap-3">
                {currentDay.exercises.map((ex, i) => (
                    <div key={ex.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            {preLoaded ? (
                                <span className="text-sm font-semibold text-white">{ex.name}</span>
                            ) : (
                                <span className="text-xs font-semibold text-zinc-500">Ejercicio {i + 1}</span>
                            )}
                            {!preLoaded && (
                                <button onClick={() => removeExercise(i)} className="text-xs text-red-400 hover:text-red-300">
                                    Eliminar
                                </button>
                            )}
                        </div>

                        {!preLoaded && (
                            <input
                                type="text"
                                placeholder="Nombre del ejercicio"
                                value={ex.name}
                                onChange={(e) => updateExercise(i, "name", e.target.value)}
                                className="h-12 rounded-lg bg-zinc-800 border border-zinc-700 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        )}

                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase">Series</label>
                                <input
                                    type="number" inputMode="numeric" placeholder="—"
                                    value={ex.targetSets || ""}
                                    onChange={(e) => updateExercise(i, "targetSets", parseInt(e.target.value) || 0)}
                                    className={inputCls}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase">Reps</label>
                                <input
                                    type="number" inputMode="numeric" placeholder="—"
                                    value={ex.targetReps || ""}
                                    onChange={(e) => updateExercise(i, "targetReps", parseInt(e.target.value) || 0)}
                                    className={inputCls}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase">Peso (kg)</label>
                                <input
                                    type="number" inputMode="decimal" placeholder="0"
                                    value={ex.initialWeight || ""}
                                    onChange={(e) => updateExercise(i, "initialWeight", parseFloat(e.target.value) || 0)}
                                    className={`${inputCls} placeholder-zinc-600`}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {!preLoaded && (
                    <button
                        onClick={addExercise}
                        className="h-12 rounded-xl border-2 border-dashed border-zinc-700 text-sm font-semibold text-zinc-400 hover:border-emerald-600 hover:text-emerald-400 transition-all active:scale-[0.98]"
                    >
                        + Agregar Ejercicio
                    </button>
                )}
            </div>
        </div>
    );
}
