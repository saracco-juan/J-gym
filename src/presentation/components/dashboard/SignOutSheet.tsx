"use client";

/**
 * SignOutSheet: confirmation before signing out when something is at stake.
 * Presentational. Anonymous accounts are pushed towards linking an email;
 * unsynced changes just need to know they stay on this device.
 */

import type { SignOutWarning } from "@/core/auth";
import BottomSheet from "@/presentation/components/ui/BottomSheet";

interface SignOutSheetProps {
    warning: SignOutWarning;
    signingOut: boolean;
    onLinkEmail: () => void;
    onConfirm: () => void;
    onCancel: () => void;
}

const DESTRUCTIVE =
    "btn border border-danger-border bg-danger-soft button-md text-danger-text hover:enabled:bg-surface-strong";

export default function SignOutSheet({
    warning,
    signingOut,
    onLinkEmail,
    onConfirm,
    onCancel,
}: SignOutSheetProps) {
    const anonymous = warning === "anonymous";
    const busy = signingOut ? "Cerrando sesión…" : null;

    return (
        <BottomSheet
            title={anonymous ? "Tu cuenta no tiene email" : "Hay cambios sin sincronizar"}
            onClose={signingOut ? () => {} : onCancel}
        >
            <p className="body-6 text-text-secondary">
                {anonymous
                    ? "Si cerrás sesión, no vas a poder volver a entrar a estos datos. Vinculá tu email antes de salir."
                    : "Quedan guardados en este dispositivo y se sincronizan cuando vuelvas a entrar con esta misma cuenta."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={anonymous ? onLinkEmail : onConfirm}
                    disabled={signingOut}
                    aria-busy={!anonymous && signingOut}
                    className="btn-primary button-md"
                >
                    {anonymous ? "Vincular email" : (busy ?? "Cerrar sesión")}
                </button>
                <button
                    type="button"
                    onClick={anonymous ? onConfirm : onCancel}
                    disabled={signingOut}
                    aria-busy={anonymous && signingOut}
                    className={anonymous ? DESTRUCTIVE : "btn-secondary button-md"}
                >
                    {anonymous ? (busy ?? "Cerrar sesión igual") : "Cancelar"}
                </button>
            </div>
        </BottomSheet>
    );
}
