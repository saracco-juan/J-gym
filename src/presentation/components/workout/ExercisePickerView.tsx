"use client";

/**
 * ExercisePickerView — searchable, filterable exercise list in a bottom sheet.
 * Presentational: data and callbacks come from ExercisePicker.
 */

import { Plus, MagnifyingGlass } from "@phosphor-icons/react";
import type { MuscleGroup } from "@/core/catalog";
import { MUSCLE_GROUPS, muscleGroupLabel, type PickerOption } from "@/core/catalog/picker";
import BottomSheet from "@/presentation/components/ui/BottomSheet";

interface ExercisePickerViewProps {
    title: string;
    options: PickerOption[];
    query: string;
    onQueryChange: (query: string) => void;
    muscleGroup: MuscleGroup | null;
    onMuscleGroupChange: (group: MuscleGroup | null) => void;
    onSelect: (option: PickerOption) => void;
    onCreateRequest: () => void;
    onClose: () => void;
    /** When set, the sheet shows this content instead of the list (create form). */
    children?: React.ReactNode;
}

function chipClass(active: boolean): string {
    return `pressable body-5 h-12 shrink-0 rounded-full border px-4 ${
        active
            ? "border-accent-hover bg-accent-soft text-accent-text"
            : "border-surface-border text-text-secondary hover:bg-surface-strong"
    }`;
}

export default function ExercisePickerView({
    title,
    options,
    query,
    onQueryChange,
    muscleGroup,
    onMuscleGroupChange,
    onSelect,
    onCreateRequest,
    onClose,
    children,
}: ExercisePickerViewProps) {
    return (
        <BottomSheet title={title} onClose={onClose} tall>
            {children ?? (
                <>
                    <div className="relative">
                        <MagnifyingGlass
                            size={20}
                            weight="bold"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            placeholder="Buscar ejercicio"
                            autoComplete="off"
                            className="field-with-icon"
                            aria-label="Buscar ejercicio"
                        />
                    </div>

                    <div
                        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1"
                        role="group"
                        aria-label="Filtrar por grupo muscular"
                    >
                        <button
                            type="button"
                            onClick={() => onMuscleGroupChange(null)}
                            className={chipClass(muscleGroup === null)}
                            aria-pressed={muscleGroup === null}
                        >
                            Todos
                        </button>
                        {MUSCLE_GROUPS.map((group) => (
                            <button
                                key={group}
                                type="button"
                                onClick={() => onMuscleGroupChange(muscleGroup === group ? null : group)}
                                className={chipClass(muscleGroup === group)}
                                aria-pressed={muscleGroup === group}
                            >
                                {muscleGroupLabel(group)}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={onCreateRequest}
                        className="btn-dashed button-md mt-3"
                    >
                        <Plus size={20} weight="bold" /> Crear ejercicio
                    </button>

                    <ul className="mt-3 flex flex-col gap-2">
                        {options.map((option) => (
                            <li key={`${option.ref.source}:${option.ref.id}`}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(option)}
                                    className="pressable flex min-h-12 w-full flex-col items-start justify-center rounded-xl border border-surface-border bg-surface-overlay px-4 py-2 text-left hover:bg-surface-strong"
                                >
                                    <span className="body-4 text-text-primary">{option.name}</span>
                                    <span className="caption-5 text-text-muted">
                                        {muscleGroupLabel(option.muscleGroup)}
                                        {option.isBodyweight ? " · Peso corporal" : ""}
                                        {option.ref.source === "custom" ? " · Personalizado" : ""}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {options.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <div className="flex size-16 items-center justify-center rounded-xl border border-surface-border bg-surface-overlay">
                                <MagnifyingGlass size={32} weight="bold" className="text-text-muted" />
                            </div>
                            <h3 className="title-3 text-text-primary">Sin resultados</h3>
                            <p className="body-6 max-w-xs text-text-secondary">
                                No hay ejercicios que coincidan. Podés crear uno nuevo.
                            </p>
                        </div>
                    )}
                </>
            )}
        </BottomSheet>
    );
}
