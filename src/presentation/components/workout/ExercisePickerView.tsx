"use client";

/**
 * ExercisePickerView — searchable, filterable exercise list in a bottom sheet.
 * Presentational: data and callbacks come from ExercisePicker.
 */

import { Plus, Search } from "lucide-react";
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
    return `h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
        active
            ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
            : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
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
                        <Search
                            size={18}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            placeholder="Buscar ejercicio"
                            autoComplete="off"
                            className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-3 text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            aria-label="Buscar ejercicio"
                        />
                    </div>

                    <div
                        className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1"
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
                        className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-700 text-sm font-semibold text-emerald-400 hover:bg-emerald-900/20"
                    >
                        <Plus size={16} /> Crear ejercicio
                    </button>

                    <ul className="mt-3 flex flex-col gap-1.5">
                        {options.map((option) => (
                            <li key={`${option.ref.source}:${option.ref.id}`}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(option)}
                                    className="flex min-h-12 w-full flex-col items-start justify-center rounded-xl bg-white/5 px-4 py-2 text-left hover:bg-white/10 active:scale-[0.99]"
                                >
                                    <span className="text-sm font-semibold text-white">{option.name}</span>
                                    <span className="text-xs text-zinc-500">
                                        {muscleGroupLabel(option.muscleGroup)}
                                        {option.isBodyweight ? " · Peso corporal" : ""}
                                        {option.ref.source === "custom" ? " · Personalizado" : ""}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {options.length === 0 && (
                        <p className="py-6 text-center text-sm text-zinc-500">
                            No hay ejercicios que coincidan. Podés crear uno nuevo.
                        </p>
                    )}
                </>
            )}
        </BottomSheet>
    );
}
