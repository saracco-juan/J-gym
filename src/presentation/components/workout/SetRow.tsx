"use client";

/**
 * SetRow — one set of an exercise.
 *
 * Presentational. Shows the planned values (or the logged ones once done).
 * The big check button logs the set exactly as planned in one tap (or undoes
 * it when already logged); tapping the values opens the inline editor.
 */

import { Check } from "@phosphor-icons/react";
import { formatSetValue } from "@/core/session";

interface SetRowProps {
    setNumber: number;
    targetReps: number;
    targetWeight: number;
    isBodyweight: boolean;
    logged: { reps: number; weight: number } | null;
    onToggle: () => void;
    onEdit: () => void;
}

export default function SetRow({
    setNumber,
    targetReps,
    targetWeight,
    isBodyweight,
    logged,
    onToggle,
    onEdit,
}: SetRowProps) {
    const hasTarget = targetReps > 0 && (isBodyweight || targetWeight > 0);
    const targetText = hasTarget ? formatSetValue(targetReps, targetWeight, isBodyweight) : null;
    const loggedText = logged ? formatSetValue(logged.reps, logged.weight, isBodyweight) : null;
    const differs = logged !== null && targetText !== null && loggedText !== targetText;

    return (
        <div
            className={`interactive flex items-center gap-2 rounded-xl border p-1 pl-3 ${
                logged
                    ? "border-accent-border bg-accent-soft"
                    : "border-surface-border bg-surface-overlay"
            }`}
        >
            <span className="caption-3 w-6 shrink-0 text-text-muted">S{setNumber}</span>

            <button
                type="button"
                onClick={onEdit}
                className="interactive flex min-h-12 min-w-0 flex-1 flex-col items-start justify-center rounded-lg text-left hover:bg-surface-strong"
                aria-label={`Editar serie ${setNumber}`}
            >
                <span
                    className={`body-1 font-mono ${
                        logged ? "text-accent-text" : hasTarget ? "text-text-primary" : "text-text-muted"
                    }`}
                >
                    {loggedText ?? targetText ?? "Sin objetivo"}
                </span>
                {differs && targetText && (
                    <span className="caption-5 text-text-muted">Objetivo {targetText}</span>
                )}
                {!logged && !hasTarget && (
                    <span className="caption-5 text-text-muted">Tocá para ingresar</span>
                )}
            </button>

            <button
                type="button"
                onClick={onToggle}
                className={`pressable flex size-12 shrink-0 items-center justify-center rounded-lg ${
                    logged
                        ? "bg-accent text-text-primary hover:bg-accent-hover"
                        : "border border-surface-border bg-surface-strong text-text-secondary hover:border-accent-hover hover:text-accent-text"
                }`}
                aria-label={
                    logged
                        ? `Deshacer serie ${setNumber}`
                        : `Completar serie ${setNumber} como planificada`
                }
                aria-pressed={logged !== null}
            >
                <Check size={24} weight="bold" />
            </button>
        </div>
    );
}
