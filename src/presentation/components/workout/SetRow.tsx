"use client";

/**
 * SetRow — Fila individual para una serie de un ejercicio.
 *
 * Inputs numéricos para "Reps logradas" y "Peso utilizado".
 * Mobile-first: inputMode="decimal" para teclado numérico,
 * áreas de toque grandes (h-12).
 */

import { useState, useCallback } from "react";

interface SetRowProps {
    exerciseId: string;
    setIndex: number;
    targetReps: number;
    targetWeight: number;
    onLog: (exerciseId: string, setIndex: number, reps: number, weight: number) => void;
}

export default function SetRow({
    exerciseId,
    setIndex,
    targetReps,
    targetWeight,
    onLog,
}: SetRowProps) {
    const [reps, setReps] = useState<string>("");
    const [weight, setWeight] = useState<string>("");
    const [isLogged, setIsLogged] = useState(false);

    const handleConfirm = useCallback(() => {
        const parsedReps = parseInt(reps, 10);
        const parsedWeight = parseFloat(weight);

        if (isNaN(parsedReps) || isNaN(parsedWeight)) return;
        if (parsedReps <= 0 || parsedWeight < 0) return;

        onLog(exerciseId, setIndex, parsedReps, parsedWeight);
        setIsLogged(true);
    }, [reps, weight, exerciseId, setIndex, onLog]);

    return (
        <div
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isLogged
                    ? "bg-emerald-900/30 border border-emerald-700/50"
                    : "bg-white/5 border border-white/10"
                }`}
        >
            {/* Número de serie */}
            <span className="text-xs font-bold text-zinc-500 w-6 shrink-0">
                S{setIndex + 1}
            </span>

            {/* Objetivo (referencia visual) */}
            <span className="text-xs text-zinc-500 w-16 shrink-0 text-center">
                {targetReps}r × {targetWeight}kg
            </span>

            {/* Input: Reps */}
            <input
                type="number"
                inputMode="numeric"
                placeholder="Reps"
                value={reps}
                onChange={(e) => {
                    setReps(e.target.value);
                    if (isLogged) setIsLogged(false);
                }}
                disabled={isLogged}
                className="h-12 w-16 rounded-lg bg-zinc-800 border border-zinc-700 text-center text-sm font-semibold text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`Repeticiones serie ${setIndex + 1}`}
            />

            {/* Input: Peso */}
            <input
                type="number"
                inputMode="decimal"
                placeholder="Kg"
                value={weight}
                onChange={(e) => {
                    setWeight(e.target.value);
                    if (isLogged) setIsLogged(false);
                }}
                disabled={isLogged}
                className="h-12 w-16 rounded-lg bg-zinc-800 border border-zinc-700 text-center text-sm font-semibold text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`Peso serie ${setIndex + 1}`}
            />

            {/* Botón confirmar */}
            <button
                onClick={handleConfirm}
                disabled={isLogged || !reps || !weight}
                className={`h-12 w-12 shrink-0 rounded-lg font-bold text-sm transition-all ${isLogged
                        ? "bg-emerald-700 text-emerald-200 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
                    }`}
                aria-label={isLogged ? `Serie ${setIndex + 1} completada` : `Confirmar serie ${setIndex + 1}`}
            >
                {isLogged ? "✓" : "OK"}
            </button>
        </div>
    );
}
