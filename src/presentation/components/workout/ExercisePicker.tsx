"use client";

/**
 * ExercisePicker — container of the add/replace exercise sheet.
 *
 * Loads the user's custom exercises from the local database, merges them with
 * the catalog (pure logic in core), and creates new custom exercises through
 * the local repository (which enqueues them for sync).
 */

import { useEffect, useMemo, useState } from "react";
import type { CustomExercise, ExerciseRef, MuscleGroup } from "@/core/catalog";
import { buildPickerOptions, type PickerOption } from "@/core/catalog/picker";
import type { ExerciseDescriptor } from "@/core/session";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { useSyncStore } from "@/presentation/stores/useSyncStore";
import CreateExerciseForm from "./CreateExerciseForm";
import ExercisePickerView from "./ExercisePickerView";

interface ExercisePickerProps {
    mode: "add" | "replace";
    /** Exercises to hide, e.g. the one being replaced. */
    exclude?: ExerciseRef[];
    onSelect: (exercise: ExerciseDescriptor) => void;
    onClose: () => void;
}

function toDescriptor(option: PickerOption): ExerciseDescriptor {
    return { ref: option.ref, name: option.name, isBodyweight: option.isBodyweight };
}

export default function ExercisePicker({ mode, exclude, onSelect, onClose }: ExercisePickerProps) {
    const userId = useSyncStore((s) => s.userId);
    const [custom, setCustom] = useState<CustomExercise[]>([]);
    const [query, setQuery] = useState("");
    const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
    const [creating, setCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        getLocalRepositories()
            .customExercises.listByUser(userId)
            .then((rows) => {
                if (!cancelled) setCustom(rows);
            })
            .catch(() => {
                // Without custom exercises the catalog still works.
            });
        return () => {
            cancelled = true;
        };
    }, [userId]);

    const options = useMemo(
        () => buildPickerOptions({ query, muscleGroup, custom, exclude }),
        [query, muscleGroup, custom, exclude]
    );

    const handleCreate = async (input: {
        name: string;
        muscleGroup: MuscleGroup;
        isBodyweight: boolean;
    }) => {
        if (!userId) {
            setSaveError("No se pudo identificar al usuario. Intentá de nuevo.");
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
            const created = await getLocalRepositories().customExercises.create(userId, input);
            onSelect({
                ref: { source: "custom", id: created.id },
                name: created.name,
                isBodyweight: created.isBodyweight,
            });
        } catch {
            setSaveError("No se pudo guardar el ejercicio en el dispositivo. Intentá de nuevo.");
            setIsSaving(false);
        }
    };

    return (
        <ExercisePickerView
            title={mode === "replace" ? "Reemplazar ejercicio" : "Agregar ejercicio"}
            options={options}
            query={query}
            onQueryChange={setQuery}
            muscleGroup={muscleGroup}
            onMuscleGroupChange={setMuscleGroup}
            onSelect={(option) => onSelect(toDescriptor(option))}
            onCreateRequest={() => setCreating(true)}
            onClose={onClose}
        >
            {creating ? (
                <CreateExerciseForm
                    initialName={query}
                    existing={custom}
                    isSaving={isSaving}
                    saveError={saveError}
                    onCreate={handleCreate}
                    onCancel={() => setCreating(false)}
                />
            ) : undefined}
        </ExercisePickerView>
    );
}
