"use client";

/**
 * DeleteAccountSheet: last confirmation before deleting the account. The
 * destructive button stays disabled until the phrase is typed, and offline
 * explains why. Presentational.
 */

import { useId } from "react";
import { DELETE_CONFIRMATION_PHRASE } from "@/core/account";
import BottomSheet from "@/presentation/components/ui/BottomSheet";
import type { DeleteAccountFlow } from "./useDeleteAccount";

const DESTRUCTIVE =
    "btn border border-danger-border bg-danger-soft button-md text-danger-text hover:enabled:bg-surface-strong disabled:opacity-50";

export default function DeleteAccountSheet({ flow }: { flow: DeleteAccountFlow }) {
    const fieldId = useId();
    const messageId = useId();
    const message =
        flow.block === "offline"
            ? "Sin conexión. Conectate a internet para eliminar tu cuenta."
            : flow.error;

    return (
        <BottomSheet title="Eliminar tu cuenta" onClose={flow.busy ? () => {} : flow.close}>
            <p className="body-6 text-text-secondary">
                Se borran para siempre tus rutinas, entrenamientos, perfil y estadísticas. No se
                puede deshacer.
            </p>

            <div className="mt-4 flex flex-col gap-2">
                <label htmlFor={fieldId} className="body-5 text-text-primary">
                    Escribí {DELETE_CONFIRMATION_PHRASE} para confirmar
                </label>
                <input
                    id={fieldId}
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    value={flow.typed}
                    onChange={(e) => flow.setTyped(e.target.value)}
                    disabled={flow.busy}
                    className="field"
                    aria-describedby={message ? messageId : undefined}
                />
                {message && (
                    <p id={messageId} role="alert" className="body-6 text-danger-text">
                        {message}
                    </p>
                )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => void flow.confirm()}
                    disabled={flow.block !== null || flow.busy}
                    aria-busy={flow.busy}
                    className={DESTRUCTIVE}
                >
                    {flow.busy ? "Eliminando…" : "Eliminar cuenta definitivamente"}
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
