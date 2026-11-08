"use client";

/**
 * SetEditor — inline editor for the actual reps and weight of one set.
 *
 * Presentational: owns only the text of the two fields. For bodyweight
 * exercises the weight field is the optional added load ("lastre").
 */

import { useState, type FormEvent } from "react";
import { parseSetInput, weightFieldLabel } from "@/core/session";

interface SetEditorProps {
    setNumber: number;
    isBodyweight: boolean;
    initialReps: string;
    initialWeight: string;
    onSave: (reps: number, weight: number) => void;
    onCancel: () => void;
}

const INPUT_CLASS =
    "h-12 w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 text-center text-base font-semibold text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

export default function SetEditor({
    setNumber,
    isBodyweight,
    initialReps,
    initialWeight,
    onSave,
    onCancel,
}: SetEditorProps) {
    const [reps, setReps] = useState(initialReps);
    const [weight, setWeight] = useState(initialWeight);
    const [hasError, setHasError] = useState(false);

    const weightLabel = weightFieldLabel(isBodyweight);
    const focusWeightFirst = initialReps !== "" && initialWeight === "";

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const parsed = parseSetInput(reps, weight, isBodyweight);
        if (!parsed) {
            setHasError(true);
            return;
        }
        onSave(parsed.reps, parsed.weight);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-xl border border-emerald-700/60 bg-zinc-950/60 p-3"
            aria-label={`Editar serie ${setNumber}`}
        >
            <div className="flex items-end gap-3">
                <span className="pb-3 text-xs font-bold text-zinc-500">S{setNumber}</span>
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-400">
                    Reps
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        autoFocus={!focusWeightFirst}
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className={INPUT_CLASS}
                        aria-label={`Repeticiones serie ${setNumber}`}
                    />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-400">
                    {weightLabel}
                    <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        autoFocus={focusWeightFirst}
                        placeholder={isBodyweight ? "0" : ""}
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className={INPUT_CLASS}
                        aria-label={`${weightLabel} serie ${setNumber}`}
                    />
                </label>
            </div>

            {hasError && (
                <p role="alert" className="text-xs text-red-400">
                    {isBodyweight
                        ? "Ingresá repeticiones válidas. El lastre es opcional."
                        : "Ingresá repeticiones y peso válidos."}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-12 flex-1 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 active:scale-[0.98]"
                    aria-label={`Cancelar edición de la serie ${setNumber}`}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="h-12 flex-[2] rounded-xl bg-emerald-600 text-sm font-bold text-white active:scale-[0.98] hover:bg-emerald-500"
                    aria-label={`Guardar serie ${setNumber}`}
                >
                    Guardar serie
                </button>
            </div>
        </form>
    );
}
