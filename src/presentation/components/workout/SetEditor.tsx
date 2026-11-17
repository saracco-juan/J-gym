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

const INPUT_CLASS = "field text-center";

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
            className="flex flex-col gap-3 rounded-xl border border-accent-border bg-surface-base p-3"
            aria-label={`Editar serie ${setNumber}`}
        >
            <div className="flex items-end gap-3">
                <span className="caption-3 pb-4 text-text-muted">S{setNumber}</span>
                <label className="caption-4 flex min-w-0 flex-1 flex-col gap-1 text-text-secondary">
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
                <label className="caption-4 flex min-w-0 flex-1 flex-col gap-1 text-text-secondary">
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
                <p role="alert" className="caption-5 text-danger-text">
                    {isBodyweight
                        ? "Ingresá repeticiones válidas. El lastre es opcional."
                        : "Ingresá repeticiones y peso válidos."}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn-secondary button-sm flex-1"
                    aria-label={`Cancelar edición de la serie ${setNumber}`}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="btn-primary button-sm flex-2"
                    aria-label={`Guardar serie ${setNumber}`}
                >
                    Guardar serie
                </button>
            </div>
        </form>
    );
}
