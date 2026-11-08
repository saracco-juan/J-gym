"use client";

/**
 * WeightInputModal — Modal/bottom-sheet para entrada manual de peso.
 *
 * Se muestra cuando isWeightModalOpen es true en el store.
 * Itera sobre pendingWeightUpdates y pide el nuevo peso para cada ejercicio.
 *
 * REGLA: El input empieza VACÍO — nunca sugiere un peso automáticamente.
 */

import { useState, useCallback } from "react";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";
import { TrendingUp } from "lucide-react";

export default function WeightInputModal() {
    const session = useWorkoutStore((s) => s.session);
    const pendingWeightUpdates = useWorkoutStore((s) => s.pendingWeightUpdates);
    const isWeightModalOpen = useWorkoutStore((s) => s.isWeightModalOpen);
    const confirmNewWeight = useWorkoutStore((s) => s.confirmNewWeight);

    const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});

    const handleChange = useCallback((exerciseId: string, value: string) => {
        setWeightInputs((prev) => ({ ...prev, [exerciseId]: value }));
    }, []);

    const handleConfirm = useCallback(
        (exerciseId: string) => {
            const raw = weightInputs[exerciseId];
            const parsed = parseFloat(raw);

            if (isNaN(parsed) || parsed <= 0) return;

            confirmNewWeight(exerciseId, parsed);

            // Limpiar el input del ejercicio confirmado
            setWeightInputs((prev) => {
                const next = { ...prev };
                delete next[exerciseId];
                return next;
            });
        },
        [weightInputs, confirmNewWeight]
    );

    if (!isWeightModalOpen || pendingWeightUpdates.length === 0) return null;

    // Resolver nombre de cada ejercicio pendiente
    const pendingExercises = pendingWeightUpdates.map((id) => {
        const found = session?.exercises.find(
            (e) => e.key === id
        );
        return {
            id,
            name: found?.name ?? "Ejercicio",
        };
    });

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Bottom sheet / modal */}
            <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-3">
                    <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-4 sm:hidden" />
                    <h2 className="text-lg font-bold text-white">
                        <TrendingUp size={20} className="inline mr-1.5 text-amber-400" /> ¡Subí el peso!
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        Superaste el esquema en estos ejercicios. Ingresá el nuevo peso
                        para la próxima sesión.
                    </p>
                </div>

                {/* Ejercicios pendientes */}
                <div className="flex flex-col gap-4 px-5 pb-5">
                    {pendingExercises.map(({ id, name }) => (
                        <div key={id} className="flex flex-col gap-2">
                            <label
                                htmlFor={`weight-${id}`}
                                className="text-sm font-semibold text-zinc-300"
                            >
                                {name}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id={`weight-${id}`}
                                    type="number"
                                    inputMode="decimal"
                                    placeholder=""
                                    value={weightInputs[id] ?? ""}
                                    onChange={(e) => handleChange(id, e.target.value)}
                                    className="h-14 flex-1 rounded-xl bg-zinc-800 border border-zinc-600 px-4 text-lg font-semibold text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    aria-label={`Nuevo peso para ${name} en kilogramos`}
                                />
                                <span className="flex items-center text-sm font-medium text-zinc-500">
                                    kg
                                </span>
                                <button
                                    onClick={() => handleConfirm(id)}
                                    disabled={!weightInputs[id]}
                                    className="h-14 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 font-bold text-white text-sm transition-all disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
                                    aria-label={`Confirmar peso para ${name}`}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
