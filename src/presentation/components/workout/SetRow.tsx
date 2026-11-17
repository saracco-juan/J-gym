"use client";

/**
 * SetRow — one set of an exercise.
 *
 * Presentational. Shows the planned values (or the logged ones once done).
 * The big check button logs the set exactly as planned in one tap (or undoes
 * it when already logged); tapping the values opens the inline editor.
 */

import { Check } from "lucide-react";
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
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors ${
                logged
                    ? "border-emerald-700/50 bg-emerald-900/30"
                    : "border-white/10 bg-white/5"
            }`}
        >
            <span className="w-6 shrink-0 text-xs font-bold text-zinc-500">S{setNumber}</span>

            <button
                type="button"
                onClick={onEdit}
                className="flex min-h-12 min-w-0 flex-1 flex-col items-start justify-center text-left"
                aria-label={`Editar serie ${setNumber}`}
            >
                <span
                    className={`text-base font-semibold ${
                        logged ? "text-emerald-200" : hasTarget ? "text-white" : "text-zinc-400"
                    }`}
                >
                    {loggedText ?? targetText ?? "Sin objetivo"}
                </span>
                {differs && targetText && (
                    <span className="text-xs text-zinc-500">Objetivo {targetText}</span>
                )}
                {!logged && !hasTarget && (
                    <span className="text-xs text-zinc-500">Tocá para ingresar</span>
                )}
            </button>

            <button
                type="button"
                onClick={onToggle}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
                    logged
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-emerald-500 hover:text-emerald-400"
                }`}
                aria-label={
                    logged
                        ? `Deshacer serie ${setNumber}`
                        : `Completar serie ${setNumber} como planificada`
                }
                aria-pressed={logged !== null}
            >
                <Check size={22} strokeWidth={3} />
            </button>
        </div>
    );
}
