"use client";

/**
 * LoginView — Pantalla de login para PWA de gimnasio.
 *
 * Dos métodos de acceso:
 * 1. Código de 6 dígitos por email (sin contraseña, se escribe dentro de la app)
 * 2. Demo anónima (sin registro)
 *
 * El código reemplaza al magic link: los links abren Safari y no la PWA instalada.
 * Mobile-first con inputs grandes y estados de carga/error.
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInAsDemo } from "@/infrastructure/auth/demoSignIn";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import {
    classifyAuthError,
    cooldownRemainingSeconds,
    isCompleteOtpCode,
    isValidEmail,
    normalizeOtpCode,
    OTP_LENGTH,
    RESEND_COOLDOWN_SECONDS,
    type AuthErrorKind,
} from "@/core/auth/otp";
import { Dumbbell, Mail } from "lucide-react";

type Step = "email" | "code";
// Each action has its own pending state so only the clicked control shows progress.
type Pending = "sending" | "verifying" | "resending" | "starting-demo" | null;

const SEND_ERRORS: Record<AuthErrorKind, string> = {
    "invalid-code": "No pudimos enviar el código. Revisá el email e intentá de nuevo.",
    "rate-limit": "Pediste demasiados códigos. Esperá unos minutos y probá de nuevo.",
    network: "Sin conexión. Revisá tu internet e intentá de nuevo.",
    unknown: "No pudimos enviar el código. Probá de nuevo en un momento.",
};

const VERIFY_ERRORS: Record<AuthErrorKind, string> = {
    "invalid-code": "El código es incorrecto o venció. Revisá tu correo o pedí uno nuevo.",
    "rate-limit": "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
    network: "Sin conexión. Revisá tu internet e intentá de nuevo.",
    unknown: "No pudimos verificar el código. Probá de nuevo.",
};

export default function LoginView() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [pending, setPending] = useState<Pending>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [cooldownStart, setCooldownStart] = useState<number | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const isBusy = pending !== null;

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
    const sendCode = useCallback(
        async (kind: "sending" | "resending"): Promise<boolean> => {
            setPending(kind);
            setErrorMsg("");

            const supabase = createSupabaseBrowserClient();
            // No emailRedirectTo: we want a code, not a link that opens Safari.
            const { error } = await supabase.auth.signInWithOtp({
                email: email.trim(),
                options: { shouldCreateUser: true },
            });
            setPending(null);

            if (error) {
                setErrorMsg(SEND_ERRORS[classifyAuthError(error)]);
                return false;
            }
            setCooldownStart(Date.now());
            return true;
        },
        [email],
    );

    const handleSendCode = useCallback(async () => {
        if (!isValidEmail(email)) {
            setErrorMsg("Ingresá un email válido.");
            return;
        }
        if (await sendCode("sending")) {
            setCode("");
            setStep("code");
        }
    }, [email, sendCode]);

    const handleResend = useCallback(async () => {
        if (cooldown > 0) return;
        if (await sendCode("resending")) setCode("");
    }, [cooldown, sendCode]);

    const verifyCode = useCallback(
        async (token: string) => {
            if (!isCompleteOtpCode(token)) {
                setErrorMsg(`Ingresá el código de ${OTP_LENGTH} dígitos.`);
                return;
            }
            setPending("verifying");
            setErrorMsg("");

            const supabase = createSupabaseBrowserClient();
            const { error } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token,
                type: "email",
            });

            if (error) {
                setPending(null);
                setCode("");
                setErrorMsg(VERIFY_ERRORS[classifyAuthError(error)]);
                return;
            }
            // The dashboard sends users without routines to onboarding.
            router.replace("/dashboard");
        },
        [email, router],
    );

    const handleCodeChange = (raw: string) => {
        const next = normalizeOtpCode(raw);
        setCode(next);
        setErrorMsg("");
        if (isCompleteOtpCode(next)) void verifyCode(next);
    };

    const handleChangeEmail = () => {
        setStep("email");
        setCode("");
        setErrorMsg("");
        setCooldownStart(null);
        setCooldown(0);
    };

    const handleDemo = useCallback(async () => {
        setPending("starting-demo");
        setErrorMsg("");

        const { success } = await signInAsDemo();

        if (success) {
            // The dashboard sends users without routines to onboarding.
            router.push("/dashboard");
        } else {
            setPending(null);
            setErrorMsg("No pudimos iniciar la demo. Probá de nuevo.");
        }
    }, [router]);

    const spinner = (
        <span className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-zinc-950">
            {/* Logo */}
            <div className="flex flex-col items-center gap-3 mb-10">
                <div className="w-20 h-20 rounded-3xl bg-emerald-600 flex items-center justify-center text-4xl shadow-lg shadow-emerald-900/40">
                    <Dumbbell size={36} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">J-GYM</h1>
                <p className="text-sm text-zinc-500">Sobrecarga Progresiva</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
                {step === "code" ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 flex items-center justify-center">
                            <Mail size={28} className="text-emerald-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white text-center">
                            ¡Revisá tu correo!
                        </h2>
                        <p className="text-sm text-zinc-400 text-center">
                            Te enviamos un código de {OTP_LENGTH} dígitos a{" "}
                            <span className="font-semibold text-white">{email.trim()}</span>.
                            Ingresalo acá para entrar.
                        </p>

                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={OTP_LENGTH}
                            placeholder="123456"
                            value={code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            disabled={isBusy}
                            autoFocus
                            className="w-full h-14 mt-2 rounded-xl bg-zinc-800 border border-zinc-700 px-4 text-center text-2xl tracking-[0.4em] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                            aria-label="Código de acceso"
                        />

                        {errorMsg && (
                            <p role="alert" className="text-sm text-red-400 text-center">
                                {errorMsg}
                            </p>
                        )}

                        {pending === "verifying" && (
                            <span className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                                {spinner}
                                Verificando...
                            </span>
                        )}

                        <button
                            onClick={handleResend}
                            disabled={isBusy || cooldown > 0}
                            className="mt-2 text-sm text-emerald-400 hover:text-emerald-300 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        >
                            {pending === "resending"
                                ? "Enviando..."
                                : cooldown > 0
                                  ? `Reenviar código (${cooldown}s)`
                                  : "Reenviar código"}
                        </button>
                        <button
                            onClick={handleChangeEmail}
                            disabled={isBusy}
                            className="text-sm text-zinc-400 hover:text-zinc-300 disabled:opacity-50"
                        >
                            Usar otro email
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-lg font-bold text-white mb-1">
                            Iniciar Sesión
                        </h2>
                        <p className="text-sm text-zinc-500 mb-5">
                            Accedé con tu email, sin contraseña.
                        </p>

                        {/* Email input */}
                        <input
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                            disabled={isBusy}
                            className="w-full h-14 rounded-xl bg-zinc-800 border border-zinc-700 px-4 text-base text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                            aria-label="Email para recibir el código"
                        />

                        {errorMsg && (
                            <p role="alert" className="mt-2 text-sm text-red-400">
                                {errorMsg}
                            </p>
                        )}

                        <button
                            onClick={handleSendCode}
                            disabled={isBusy || !email.trim()}
                            className="w-full h-14 mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white text-base transition-all disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        >
                            {pending === "sending" ? (
                                <span className="flex items-center justify-center gap-2">
                                    {spinner}
                                    Enviando...
                                </span>
                            ) : (
                                "Enviar código"
                            )}
                        </button>

                        {/* Demo */}
                        <button
                            onClick={handleDemo}
                            disabled={isBusy}
                            className="w-full h-14 mt-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 active:scale-[0.98] font-semibold text-zinc-300 text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {pending === "starting-demo" ? (
                                <span className="flex items-center justify-center gap-2">
                                    {spinner}
                                    Iniciando demo...
                                </span>
                            ) : (
                                "Probar demo sin registrarte"
                            )}
                        </button>
                    </>
                )}
            </div>

            <p className="mt-8 text-xs text-zinc-600">
                Tu sesión se mantiene activa automáticamente.
            </p>
        </div>
    );
}
