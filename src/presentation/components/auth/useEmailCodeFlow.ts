"use client";

/**
 * useEmailCodeFlow: state machine shared by every "email then code" flow
 * (login, and linking an email to an anonymous account). The two flows only
 * differ in the server calls, which are injected; the pure rules (code shape,
 * cooldown, error kinds) live in `@/core/auth`.
 *
 * Steps: "email" (ask for the address) -> "code" (type the code).
 * Resend has a cooldown; the code step offers going back to change the email.
 */

import { useCallback, useEffect, useState } from "react";
import {
    classifyAuthError,
    cooldownRemainingSeconds,
    isCompleteOtpCode,
    isValidEmail,
    normalizeOtpCode,
    RESEND_COOLDOWN_SECONDS,
    type AuthErrorKind,
} from "@/core/auth";

export type EmailCodeStep = "email" | "code";
// Each action has its own pending state so only the clicked control shows progress.
export type EmailCodePending = "sending" | "verifying" | "resending" | null;

/** What the server calls return: Supabase auth results are structurally compatible. */
export interface AuthResult {
    error: unknown;
}

export interface EmailCodeFlowConfig {
    /** Sends the first code to the (trimmed) email. */
    sendCode: (email: string) => Promise<AuthResult>;
    /** Sends a new code. Defaults to `sendCode`. */
    resendCode?: (email: string) => Promise<AuthResult>;
    /** Checks the code typed by the user. */
    verifyCode: (email: string, token: string) => Promise<AuthResult>;
    sendErrors: Record<AuthErrorKind, string>;
    verifyErrors: Record<AuthErrorKind, string>;
    /** Called once after the code was accepted. */
    onVerified: () => void;
}

export function useEmailCodeFlow(config: EmailCodeFlowConfig) {
    const { sendCode, resendCode, verifyCode, sendErrors, verifyErrors, onVerified } = config;
    const [step, setStep] = useState<EmailCodeStep>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [pending, setPending] = useState<EmailCodePending>(null);
    const [error, setError] = useState("");
    const [cooldownStart, setCooldownStart] = useState<number | null>(null);
    const [cooldown, setCooldown] = useState(0);

    // Ticks once per second while a resend cooldown is active.
    useEffect(() => {
        if (cooldownStart === null) return;
        const tick = () => {
            const left = cooldownRemainingSeconds(cooldownStart, RESEND_COOLDOWN_SECONDS, Date.now());
            setCooldown(left);
            if (left === 0) setCooldownStart(null);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [cooldownStart]);

    // Returns true when the email was sent.
    const send = useCallback(
        async (kind: "sending" | "resending"): Promise<boolean> => {
            setPending(kind);
            setError("");
            const call = kind === "resending" && resendCode ? resendCode : sendCode;
            let result: AuthResult;
            try {
                result = await call(email.trim());
            } catch (e) {
                result = { error: e };
            }
            setPending(null);
            if (result.error) {
                setError(sendErrors[classifyAuthError(result.error)]);
                return false;
            }
            setCooldownStart(Date.now());
            return true;
        },
        [email, resendCode, sendCode, sendErrors],
    );

    const submitEmail = useCallback(async () => {
        if (!isValidEmail(email)) {
            setError("Ingresá un email válido.");
            return;
        }
        if (await send("sending")) {
            setCode("");
            setStep("code");
        }
    }, [email, send]);

    const resend = useCallback(async () => {
        if (cooldown > 0 || pending !== null) return;
        if (await send("resending")) setCode("");
    }, [cooldown, pending, send]);

    const submitCode = useCallback(async () => {
        if (!isCompleteOtpCode(code)) {
            setError("Ingresá el código completo que te enviamos.");
            return;
        }
        setPending("verifying");
        setError("");
        let result: AuthResult;
        try {
            result = await verifyCode(email.trim(), code);
        } catch (e) {
            result = { error: e };
        }
        if (result.error) {
            setPending(null);
            setError(verifyErrors[classifyAuthError(result.error)]);
            return;
        }
        onVerified();
    }, [code, email, onVerified, verifyCode, verifyErrors]);

    const changeCode = useCallback((raw: string) => {
        setCode(normalizeOtpCode(raw));
        setError("");
    }, []);

    const changeEmail = useCallback(() => {
        setStep("email");
        setCode("");
        setError("");
    }, []);

    const editEmail = useCallback((value: string) => {
        setEmail(value);
        setError("");
    }, []);

    return {
        step,
        email,
        code,
        pending,
        error,
        cooldown,
        setEmail: editEmail,
        changeCode,
        submitEmail,
        submitCode,
        resend,
        changeEmail,
    };
}
