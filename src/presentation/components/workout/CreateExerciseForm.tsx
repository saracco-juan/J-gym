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
            <label className="body-5 flex flex-col gap-1 text-text-secondary">
                Nombre
                <input
                    type="text"
                    autoFocus
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field"
                    aria-invalid={nameError !== null}
                />
                {nameError && (
                    <span role="alert" className="caption-5 text-danger-text">
                        {nameError}
                    </span>
                )}
            </label>

            <label className="body-5 flex flex-col gap-1 text-text-secondary">
                Grupo muscular
                <select
                    value={muscleGroup}
                    onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
                    className="field"
                >
                    {MUSCLE_GROUPS.map((g) => (
                        <option key={g} value={g}>
                            {muscleGroupLabel(g)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="body-5 flex min-h-12 items-center gap-3 text-text-secondary">
                <input
                    type="checkbox"
                    checked={isBodyweight}
                    onChange={(e) => setIsBodyweight(e.target.checked)}
                    className="size-6 accent-accent-hover"
                />
                Con peso corporal (el lastre es opcional)
            </label>

            {saveError && (
                <p role="alert" className="caption-5 text-danger-text">
                    {saveError}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn-secondary button-sm flex-1"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    aria-busy={isSaving}
                    className="btn-primary button-sm flex-2"
                >
                    {isSaving ? "Guardando…" : "Crear y elegir"}
                </button>
            </div>
        </form>
    );
}
