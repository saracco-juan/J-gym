"use client";

/**
 * LoginView — Pantalla de login para PWA de gimnasio.
 *
 * Dos métodos de acceso:
 * 1. Magic Link por email (sin contraseña)
 * 2. Demo anónima (sin registro)
 *
 * Mobile-first con inputs grandes y estados de carga/éxito/error.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signInAsDemo } from "@/infrastructure/auth/demoSignIn";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import { Barbell, Envelope } from "@phosphor-icons/react";

// Each action has its own pending state so only the clicked button shows progress.
type LoginState = "idle" | "sending-link" | "starting-demo" | "success" | "error";

export default function LoginView() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [state, setState] = useState<LoginState>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const isBusy = state === "sending-link" || state === "starting-demo";

    const handleMagicLink = useCallback(async () => {
        if (!email.trim()) return;
        setState("sending-link");
        setErrorMsg("");

        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setState("error");
            setErrorMsg(error.message);
        } else {
            setState("success");
        }
    }, [email]);

    const handleDemo = useCallback(async () => {
        setState("starting-demo");
        setErrorMsg("");

        const { success } = await signInAsDemo();

        if (success) {
            // The dashboard sends users without routines to onboarding.
            router.push("/dashboard");
        } else {
            setState("error");
            setErrorMsg("No pudimos iniciar la demo. Probá de nuevo.");
        }
    }, [router]);

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

            {/* Card */}
            <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface-raised p-6">
                {state === "success" ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                        <div className="flex size-16 items-center justify-center rounded-xl bg-accent-soft">
                            <Envelope size={32} weight="bold" className="text-accent-text" />
                        </div>
                        <h2 className="heading-6 text-center text-text-primary">
                            Revisá tu correo
                        </h2>
                        <p className="body-6 text-center text-text-secondary">
                            Te enviamos un link mágico a{" "}
                            <span className="body-4 break-all text-text-primary">{email}</span>.
                            Hacé click para ingresar.
                        </p>
                        <button
                            type="button"
                            onClick={() => { setState("idle"); setEmail(""); }}
                            className="btn mt-2 w-full text-accent-text hover:enabled:bg-surface-strong"
                        >
                            Usar otro email
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="heading-6 mb-1 text-text-primary">Iniciar sesión</h2>
                        <p className="body-6 mb-4 text-text-muted">
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
                            onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                            disabled={isBusy}
                            className="field"
                            aria-label="Email para magic link"
                            aria-invalid={state === "error" && errorMsg !== ""}
                        />

                        {state === "error" && errorMsg && (
                            <p role="alert" className="body-6 mt-2 text-danger-text">{errorMsg}</p>
                        )}

                        <button
                            type="button"
                            onClick={handleMagicLink}
                            disabled={isBusy || !email.trim()}
                            aria-busy={state === "sending-link"}
                            className="btn-primary mt-4 w-full"
                        >
                            {state === "sending-link" ? "Enviando…" : "Enviar magic link"}
                        </button>

                        {/* Demo */}
                        <button
                            type="button"
                            onClick={handleDemo}
                            disabled={isBusy}
                            aria-busy={state === "starting-demo"}
                            className="btn-secondary mt-3 w-full"
                        >
                            {state === "starting-demo" ? "Iniciando demo…" : "Probar demo sin registrarte"}
                        </button>
                    </>
                )}
            </div>

            <p className="caption-5 mt-6 text-center text-text-muted">
                Tu sesión se mantiene activa automáticamente.
            </p>
        </div>
    );
}
