"use client";

/**
 * CreateExerciseForm — inline form to define a custom exercise
 * (name, muscle group, bodyweight flag). Presentational: validation comes
 * from the core and saving is delegated to `onCreate`.
 */

import { useState, type FormEvent } from "react";
import type { CustomExercise, MuscleGroup } from "@/core/catalog";
import {
    MUSCLE_GROUPS,
    muscleGroupLabel,
    validateCustomExerciseName,
} from "@/core/catalog/picker";

interface CreateExerciseFormProps {
    initialName: string;
    existing: readonly CustomExercise[];
    isSaving: boolean;
    saveError: string | null;
    onCreate: (input: { name: string; muscleGroup: MuscleGroup; isBodyweight: boolean }) => void;
    onCancel: () => void;
}

const NAME_ERRORS = {
    empty: "Escribí un nombre.",
    "too-long": "El nombre es demasiado largo.",
    duplicate: "Ya existe un ejercicio con ese nombre.",
} as const;

export default function CreateExerciseForm({
    initialName,
    existing,
    isSaving,
    saveError,
    onCreate,
    onCancel,
}: CreateExerciseFormProps) {
    const [name, setName] = useState(initialName);
    const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("chest");
    const [isBodyweight, setIsBodyweight] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const result = validateCustomExerciseName(name, existing);
        if (!result.ok) {
            setNameError(NAME_ERRORS[result.reason]);
            return;
        }
        setNameError(null);
        onCreate({ name: result.name, muscleGroup, isBodyweight });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2" aria-label="Crear ejercicio">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-300">
                Nombre
                <input
                    type="text"
                    autoFocus
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    aria-invalid={nameError !== null}
                />
                {nameError && (
                    <span role="alert" className="text-xs text-red-400">
                        {nameError}
                    </span>
                )}
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-300">
                Grupo muscular
                <select
                    value={muscleGroup}
                    onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
                    className="h-12 rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    {MUSCLE_GROUPS.map((g) => (
                        <option key={g} value={g}>
                            {muscleGroupLabel(g)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex min-h-11 items-center gap-3 text-sm text-zinc-300">
                <input
                    type="checkbox"
                    checked={isBodyweight}
                    onChange={(e) => setIsBodyweight(e.target.checked)}
                    className="h-5 w-5 accent-emerald-500"
                />
                Con peso corporal (el lastre es opcional)
            </label>

            {saveError && (
                <p role="alert" className="text-xs text-red-400">
                    {saveError}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-12 flex-1 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="h-12 flex-[2] rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                    {isSaving ? "Guardando..." : "Crear y elegir"}
                </button>
            </div>
        </form>
    );
}
