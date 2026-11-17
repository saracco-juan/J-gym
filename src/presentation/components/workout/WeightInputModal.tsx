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
import { TrendUp } from "@phosphor-icons/react";

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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-surface-base/80 backdrop-blur-sm" />

            {/* Bottom sheet / modal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="weight-modal-title"
                className="relative mx-4 mb-4 w-full max-w-md overflow-hidden rounded-2xl border border-surface-border bg-surface-raised sm:mb-0"
            >
                {/* Header */}
                <div className="px-4 pb-3 pt-4">
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-border sm:hidden" />
                    <h2 id="weight-modal-title" className="heading-6 flex items-center gap-2 text-text-primary">
                        <TrendUp size={24} weight="bold" className="text-accent-text" /> Subí el peso
                    </h2>
                    <p className="body-6 mt-1 text-text-secondary">
                        Superaste el esquema en estos ejercicios. Ingresá el nuevo peso
                        para la próxima sesión.
                    </p>
                </div>

                {/* Ejercicios pendientes */}
                <div className="flex flex-col gap-4 px-4 pb-4">
                    {pendingExercises.map(({ id, name }) => (
                        <div key={id} className="flex flex-col gap-2">
                            <label
                                htmlFor={`weight-${id}`}
                                className="body-5 text-text-secondary"
                            >
                                {name}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    id={`weight-${id}`}
                                    type="number"
                                    inputMode="decimal"
                                    placeholder=""
                                    value={weightInputs[id] ?? ""}
                                    onChange={(e) => handleChange(id, e.target.value)}
                                    className="field no-spin min-w-0 flex-1"
                                    aria-label={`Nuevo peso para ${name} en kilogramos`}
                                />
                                <span className="body-5 text-text-muted">
                                    kg
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleConfirm(id)}
                                    disabled={!weightInputs[id]}
                                    className="btn-primary button-sm"
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
