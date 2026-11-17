"use client";

/**
 * FinishConfirmDialog — light, non-blocking confirmation shown before
 * finishing with exercises that have nothing logged. Presentational.
 */

import BottomSheet from "@/presentation/components/ui/BottomSheet";

interface FinishConfirmDialogProps {
    unloggedCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function FinishConfirmDialog({
    unloggedCount,
    onConfirm,
    onCancel,
}: FinishConfirmDialogProps) {
    return (
        <BottomSheet title="¿Finalizar entrenamiento?" onClose={onCancel}>
            <p className="body-6 text-text-secondary">
                Hay ejercicios sin registrar. Se guardan como salteados.
            </p>
            <p className="caption-5 mt-1 text-text-muted">
                Sin registrar: {unloggedCount}
            </p>
            <div className="mt-4 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={onConfirm}
                    className="btn-primary button-md"
                >
                    Finalizar igual
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn-secondary button-md"
                >
                    Seguir entrenando
                </button>
            </div>
        </BottomSheet>
    );
}
