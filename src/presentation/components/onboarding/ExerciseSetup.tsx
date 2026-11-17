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
import { Check, Plus } from "@phosphor-icons/react";

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

const inputCls = "field no-spin text-center";

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
                <h2 className="heading-6 text-text-primary">
                    {preLoaded ? "Completá tus marcas" : "Armá tu rutina"}
                </h2>
                <p className="body-6 mt-1 text-text-muted">
                    {preLoaded
                        ? "Ingresá series, repeticiones y peso para cada ejercicio."
                        : "Agregá ejercicios para cada día. El peso es opcional."}
                </p>
            </div>

            {/* Day tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((day, i) => {
                    const allFilled = day.exercises.every(
                        (e) => e.targetSets > 0 && e.targetReps > 0
                    );
                    return (
                        <button
                            key={day.dayName}
                            type="button"
                            onClick={() => setActiveDay(i)}
                            aria-pressed={i === activeDay}
                            className={`pressable button-sm flex min-h-12 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 ${i === activeDay
                                    ? "border-accent bg-accent text-text-primary"
                                    : "border-surface-border bg-surface-raised text-text-secondary hover:bg-surface-strong"
                                }`}
                        >
                            {tabLabel(day)}
                            {preLoaded && (
                                allFilled ? (
                                    <Check size={16} weight="bold" aria-label="Completo" />
                                ) : (
                                    <span
                                        role="img"
                                        aria-label="Incompleto"
                                        className="size-2 rounded-full bg-warning-text"
                                    />
                                )
                            )}
                            {!preLoaded && day.exercises.length > 0 && (
                                <span className="caption-4 opacity-70">({day.exercises.length})</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Exercise cards */}
            <div className="flex flex-col gap-3">
                {currentDay.exercises.map((ex, i) => (
                    <div key={ex.id} className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-raised p-3">
                        <div className="flex items-center justify-between">
                            {preLoaded ? (
                                <span className="body-4 text-text-primary">{ex.name}</span>
                            ) : (
                                <span className="caption-3 text-text-muted">Ejercicio {i + 1}</span>
                            )}
                            {!preLoaded && (
                                <button
                                    type="button"
                                    onClick={() => removeExercise(i)}
                                    className="pressable button-sm min-h-12 rounded-lg px-3 py-2 text-danger-text hover:bg-danger-soft"
                                >
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
                                className="field"
                                aria-label={`Nombre del ejercicio ${i + 1}`}
                            />
                        )}

                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col gap-1">
                                <label htmlFor={`${ex.id}-sets`} className="caption-4 text-text-secondary">Series</label>
                                <input
                                    id={`${ex.id}-sets`}
                                    type="number" inputMode="numeric" placeholder="—"
                                    value={ex.targetSets || ""}
                                    onChange={(e) => updateExercise(i, "targetSets", parseInt(e.target.value) || 0)}
                                    className={inputCls}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor={`${ex.id}-reps`} className="caption-4 text-text-secondary">Reps</label>
                                <input
                                    id={`${ex.id}-reps`}
                                    type="number" inputMode="numeric" placeholder="—"
                                    value={ex.targetReps || ""}
                                    onChange={(e) => updateExercise(i, "targetReps", parseInt(e.target.value) || 0)}
                                    className={inputCls}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor={`${ex.id}-weight`} className="caption-4 text-text-secondary">Peso (kg)</label>
                                <input
                                    id={`${ex.id}-weight`}
                                    type="number" inputMode="decimal" placeholder="0"
                                    value={ex.initialWeight || ""}
                                    onChange={(e) => updateExercise(i, "initialWeight", parseFloat(e.target.value) || 0)}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {!preLoaded && (
                    <button
                        type="button"
                        onClick={addExercise}
                        className="btn-dashed button-md"
                    >
                        <Plus size={20} weight="bold" /> Agregar ejercicio
                    </button>
                )}
            </div>
        </div>
    );
}
