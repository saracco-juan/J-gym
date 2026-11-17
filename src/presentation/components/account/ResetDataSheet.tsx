"use client";

/**
 * ResetDataSheet: confirmation before wiping routine and workouts while the
 * account stays. Explains why it is blocked during a workout. Presentational.
 */

import BottomSheet from "@/presentation/components/ui/BottomSheet";
import type { ResetDataFlow } from "./useResetData";

const DESTRUCTIVE =
    "btn border border-danger-border bg-danger-soft button-md text-danger-text hover:enabled:bg-surface-strong disabled:opacity-50";

export default function ResetDataSheet({ flow }: { flow: ResetDataFlow }) {
    const message =
        flow.block === "workout-in-progress"
            ? "Tenés un entrenamiento en curso. Terminalo antes de reiniciar tus datos."
            : flow.error;

    return (
        <BottomSheet title="Reiniciar tus datos" onClose={flow.busy ? () => {} : flow.close}>
            <p className="body-6 text-text-secondary">
                Se borran tu rutina y todos tus entrenamientos. Tu cuenta, tu nombre y tu color se
                mantienen. No se puede deshacer.
            </p>
            {message && (
                <p role="alert" className="body-6 mt-3 text-danger-text">
                    {message}
                </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => void flow.confirm()}
                    disabled={flow.block !== null || flow.busy}
                    aria-busy={flow.busy}
                    className={DESTRUCTIVE}
                >
                    {flow.busy ? "Reiniciando…" : "Reiniciar datos"}
                </button>
                <button
                    type="button"
                    onClick={flow.close}
                    disabled={flow.busy}
                    className="btn-secondary button-md"
                >
                    Cancelar
                </button>
            </div>
        </BottomSheet>
    );
}
