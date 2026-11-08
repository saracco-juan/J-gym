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
            <p className="text-sm text-zinc-300">
                Hay ejercicios sin registrar. Se guardan como salteados.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
                Sin registrar: {unloggedCount}
            </p>
            <div className="mt-5 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={onConfirm}
                    className="h-12 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-500 active:scale-[0.98]"
                >
                    Finalizar igual
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-12 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 active:scale-[0.98]"
                >
                    Seguir entrenando
                </button>
            </div>
        </BottomSheet>
    );
}
