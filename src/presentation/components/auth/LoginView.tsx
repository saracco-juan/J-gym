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
import { Dumbbell, Mail } from "lucide-react";

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
                {state === "success" ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-3xl">
                            <Mail size={28} className="text-emerald-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white text-center">
                            ¡Revisá tu correo!
                        </h2>
                        <p className="text-sm text-zinc-400 text-center">
                            Te enviamos un link mágico a{" "}
                            <span className="font-semibold text-white">{email}</span>.
                            Hacé click para ingresar.
                        </p>
                        <button
                            onClick={() => { setState("idle"); setEmail(""); }}
                            className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
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
                            onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                            disabled={isBusy}
                            className="w-full h-14 rounded-xl bg-zinc-800 border border-zinc-700 px-4 text-base text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                            aria-label="Email para magic link"
                        />

                        {state === "error" && errorMsg && (
                            <p className="mt-2 text-sm text-red-400">{errorMsg}</p>
                        )}

                        <button
                            onClick={handleMagicLink}
                            disabled={isBusy || !email.trim()}
                            className="w-full h-14 mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white text-base transition-all disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        >
                            {state === "sending-link" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                                    Enviando...
                                </span>
                            ) : (
                                "Enviar Magic Link"
                            )}
                        </button>

                        {/* Demo */}
                        <button
                            onClick={handleDemo}
                            disabled={isBusy}
                            className="w-full h-14 mt-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 active:scale-[0.98] font-semibold text-zinc-300 text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {state === "starting-demo" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
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
