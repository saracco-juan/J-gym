"use client";

/**
 * LoginView: sign in with a code sent by email, no password and no link.
 *
 * The code is typed inside the app, so it works in the installed PWA (a link
 * would open the browser instead). Step 1 asks for the email, step 2 for the
 * code. Mobile-first, with inline specific errors.
 */

import { Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import type { AuthErrorKind } from "@/core/auth";
import { Barbell } from "@phosphor-icons/react";
import DeletedNotice from "./DeletedNotice";
import EmailCodeForm from "./EmailCodeForm";
import { useEmailCodeFlow } from "./useEmailCodeFlow";

const SEND_ERRORS: Record<AuthErrorKind, string> = {
    "invalid-code": "No pudimos enviar el código. Revisá el email e intentá de nuevo.",
    "rate-limit": "Pediste demasiados códigos. Esperá unos minutos y probá de nuevo.",
    "email-taken": "No pudimos enviar el código. Revisá el email e intentá de nuevo.",
    network: "Sin conexión. Revisá tu internet e intentá de nuevo.",
    unknown: "No pudimos enviar el código. Probá de nuevo en un momento.",
};

const VERIFY_ERRORS: Record<AuthErrorKind, string> = {
    "invalid-code": "El código es incorrecto o venció. Revisá tu correo o pedí uno nuevo.",
    "rate-limit": "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
    "email-taken": "No pudimos verificar el código. Probá de nuevo.",
    network: "Sin conexión. Revisá tu internet e intentá de nuevo.",
    unknown: "No pudimos verificar el código. Probá de nuevo.",
};

export default function LoginView() {
    const router = useRouter();

    const sendCode = useCallback(
        // No emailRedirectTo: we want a code, not a link that opens the browser.
        (email: string) =>
            createSupabaseBrowserClient().auth.signInWithOtp({
                email,
                options: { shouldCreateUser: true },
            }),
        [],
    );

    const verifyCode = useCallback(
        (email: string, token: string) =>
            createSupabaseBrowserClient().auth.verifyOtp({ email, token, type: "email" }),
        [],
    );

    // The dashboard sends users without routines to onboarding.
    const onVerified = useCallback(() => router.replace("/dashboard"), [router]);

    const flow = useEmailCodeFlow({
        sendCode,
        verifyCode,
        sendErrors: SEND_ERRORS,
        verifyErrors: VERIFY_ERRORS,
        onVerified,
    });

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-base px-4">
            {/* Logo */}
            <div className="mb-8 flex flex-col items-center gap-3">
                <div className="flex size-20 items-center justify-center rounded-3xl bg-accent">
                    <Barbell size={40} weight="bold" className="text-text-primary" />
                </div>
                <h1 className="heading-4 text-text-primary">J-GYM</h1>
                <p className="body-6 text-text-muted">Sobrecarga progresiva</p>
            </div>

            <Suspense fallback={null}>
                <DeletedNotice />
            </Suspense>

            {/* Card */}
            <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface-raised p-6">
                {flow.step === "email" && (
                    <>
                        <h2 className="heading-6 mb-1 text-text-primary">Iniciar sesión</h2>
                        <p className="body-6 mb-4 text-text-muted">
                            Ingresá con tu email. Te enviamos un código, sin contraseña.
                        </p>
                    </>
                )}
                {flow.step === "code" && (
                    <h2 className="heading-6 mb-2 text-text-primary">Revisá tu correo</h2>
                )}

                <EmailCodeForm
                    flow={flow}
                    submitCodeLabel="Entrar"
                    submittingCodeLabel="Entrando…"
                />
            </div>

            <p className="caption-5 mt-6 text-center text-text-muted">
                Tu sesión se mantiene activa automáticamente.
            </p>
        </div>
    );
}
