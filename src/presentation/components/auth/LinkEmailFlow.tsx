"use client";

/**
 * LinkEmailFlow: turns an anonymous account into a registered one by linking
 * an email. Same user id, so every local and server row stays where it is.
 *
 * Supabase flow (verified against the Auth docs):
 * 1. `updateUser({ email })` sends a code from the "Change Email Address"
 *    template (it must contain {{ .Token }}).
 * 2. `verifyOtp({ email, token, type: "email_change" })` confirms it. The
 *    account stops being anonymous and a fresh session comes back.
 * 3. `resend({ type: "email_change", email })` asks for a new code.
 *
 * Steps: email -> code -> done.
 */

import { useCallback, useState } from "react";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import { refreshAuthUser } from "@/presentation/stores/useAuthStore";
import type { AuthErrorKind } from "@/core/auth";
import { CheckCircle } from "@phosphor-icons/react";
import EmailCodeForm from "./EmailCodeForm";
import { useEmailCodeFlow } from "./useEmailCodeFlow";

const SEND_ERRORS: Record<AuthErrorKind, string> = {
    "email-taken": "Ese email ya está registrado en otra cuenta. Probá con otro.",
    "rate-limit": "Pediste demasiados códigos. Esperá unos minutos y probá de nuevo.",
    "invalid-code": "No pudimos enviar el código. Revisá el email e intentá de nuevo.",
    network: "Sin conexión. Revisá tu internet e intentá de nuevo.",
    unknown: "No pudimos enviar el código. Probá de nuevo en un momento.",
};

const VERIFY_ERRORS: Record<AuthErrorKind, string> = {
    "invalid-code": "El código es incorrecto o venció. Revisá tu correo o pedí uno nuevo.",
    "rate-limit": "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
    "email-taken": "Ese email ya está registrado en otra cuenta. Probá con otro.",
    network: "Sin conexión. Revisá tu internet e intentá de nuevo.",
    unknown: "No pudimos verificar el código. Probá de nuevo.",
};

interface LinkEmailFlowProps {
    /** Called when the user taps "Listo" after the email was linked. */
    onDone: () => void;
    /** Called as soon as the code was accepted (the account is no longer anonymous). */
    onLinked?: () => void;
}

export default function LinkEmailFlow({ onDone, onLinked }: LinkEmailFlowProps) {
    const [done, setDone] = useState(false);

    const sendCode = useCallback(
        (email: string) => createSupabaseBrowserClient().auth.updateUser({ email }),
        [],
    );
    const resendCode = useCallback(
        (email: string) =>
            createSupabaseBrowserClient().auth.resend({ type: "email_change", email }),
        [],
    );
    const verifyCode = useCallback(
        (email: string, token: string) =>
            createSupabaseBrowserClient().auth.verifyOtp({ email, token, type: "email_change" }),
        [],
    );
    const onVerified = useCallback(() => {
        setDone(true);
        void refreshAuthUser();
        onLinked?.();
    }, [onLinked]);

    const flow = useEmailCodeFlow({
        sendCode,
        resendCode,
        verifyCode,
        sendErrors: SEND_ERRORS,
        verifyErrors: VERIFY_ERRORS,
        onVerified,
    });

    if (done) {
        return (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className="flex size-16 items-center justify-center rounded-xl bg-accent-soft">
                    <CheckCircle size={32} weight="bold" className="text-accent-text" />
                </div>
                <h3 className="title-2 text-text-primary">Email vinculado</h3>
                <p className="body-6 text-text-secondary">
                    Tus datos quedan guardados en tu cuenta. Desde ahora ingresás con{" "}
                    <span className="body-4 break-all text-text-primary">{flow.email.trim()}</span>.
                </p>
                <button type="button" onClick={onDone} className="btn-primary mt-2 w-full button-md">
                    Listo
                </button>
            </div>
        );
    }

    return (
        <div>
            {flow.step === "email" && (
                <p className="body-6 mb-4 text-text-secondary">
                    Tu cuenta no tiene email: si cerrás sesión o cambiás de celular, perdés tus
                    datos. Vinculá uno y quedan a salvo. Te enviamos un código para confirmarlo.
                </p>
            )}
            <EmailCodeForm
                flow={flow}
                submitCodeLabel="Vincular email"
                submittingCodeLabel="Vinculando…"
            />
        </div>
    );
}
