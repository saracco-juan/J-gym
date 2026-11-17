"use client";

/**
 * EmailCodeForm: the two steps of an "email then code" flow (see
 * useEmailCodeFlow). Presentational: the owner provides the flow and the
 * copy that changes between login and email linking.
 */

import { useEffect, useId, useRef } from "react";
import type { useEmailCodeFlow } from "./useEmailCodeFlow";

type Flow = ReturnType<typeof useEmailCodeFlow>;

interface EmailCodeFormProps {
    flow: Flow;
    /** Label of the main button on the code step ("Entrar", "Vincular"). */
    submitCodeLabel: string;
    /** Busy label of that button. */
    submittingCodeLabel: string;
}

export default function EmailCodeForm({
    flow,
    submitCodeLabel,
    submittingCodeLabel,
}: EmailCodeFormProps) {
    const errorId = useId();
    const codeRef = useRef<HTMLInputElement>(null);
    const isBusy = flow.pending !== null;
    const hasError = flow.error !== "";

    // Moves focus to the code field once the email step is done.
    useEffect(() => {
        if (flow.step === "code") codeRef.current?.focus();
    }, [flow.step]);

    if (flow.step === "email") {
        return (
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    void flow.submitEmail();
                }}
            >
                <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    placeholder="tu@email.com"
                    value={flow.email}
                    onChange={(e) => flow.setEmail(e.target.value)}
                    disabled={isBusy}
                    className="field"
                    aria-label="Email"
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                />
                {hasError && (
                    <p id={errorId} role="alert" className="body-6 mt-2 text-danger-text">
                        {flow.error}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={isBusy || flow.email.trim() === ""}
                    aria-busy={flow.pending === "sending"}
                    className="btn-primary mt-4 w-full button-md"
                >
                    {flow.pending === "sending" ? "Enviando…" : "Enviar código"}
                </button>
            </form>
        );
    }

    return (
        <form
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                void flow.submitCode();
            }}
        >
            <p className="body-6 text-text-secondary">
                Te enviamos un código a{" "}
                <span className="body-4 break-all text-text-primary">{flow.email.trim()}</span>.
                Escribilo o pegalo acá.
            </p>
            <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={14}
                placeholder="Código"
                value={flow.code}
                onChange={(e) => flow.changeCode(e.target.value)}
                disabled={flow.pending === "verifying"}
                className="field mt-4 text-center font-mono tracking-widest"
                aria-label="Código de verificación"
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
            />
            {hasError && (
                <p id={errorId} role="alert" className="body-6 mt-2 text-danger-text">
                    {flow.error}
                </p>
            )}
            <button
                type="submit"
                disabled={isBusy || flow.code === ""}
                aria-busy={flow.pending === "verifying"}
                className="btn-primary mt-4 w-full button-md"
            >
                {flow.pending === "verifying" ? submittingCodeLabel : submitCodeLabel}
            </button>
            <button
                type="button"
                onClick={() => void flow.resend()}
                disabled={isBusy || flow.cooldown > 0}
                aria-busy={flow.pending === "resending"}
                className="btn-secondary mt-2 w-full button-md"
            >
                {flow.pending === "resending"
                    ? "Reenviando…"
                    : flow.cooldown > 0
                      ? `Reenviar código en ${flow.cooldown} s`
                      : "Reenviar código"}
            </button>
            <button
                type="button"
                onClick={flow.changeEmail}
                disabled={isBusy}
                className="btn mt-1 w-full text-accent-text hover:enabled:bg-surface-strong button-md"
            >
                Cambiar email
            </button>
        </form>
    );
}
