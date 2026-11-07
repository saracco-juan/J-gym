"use client";

/**
 * LoginView — Pantalla de login para PWA de gimnasio.
 *
 * Dos métodos de acceso:
 * 1. Google OAuth (un clic)
 * 2. Magic Link por email (sin contraseña)
 *
 * Mobile-first con inputs grandes y estados de carga/éxito/error.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signInAsDemo } from "@/infrastructure/auth/demoSignIn";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import { Dumbbell, Mail } from "lucide-react";

type LoginState = "idle" | "loading" | "success" | "error";

export default function LoginView() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [state, setState] = useState<LoginState>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleMagicLink = useCallback(async () => {
        if (!email.trim()) return;
        setState("loading");
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
        setState("loading");
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

    const handleGoogleLogin = useCallback(async () => {
        setState("loading");
        setErrorMsg("");

        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setState("error");
            setErrorMsg(error.message);
        }
        // If successful, the browser redirects to Google — no state change needed
    }, []);

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
                            Accedé con Google o por email.
                        </p>

                        {/* Google button */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={state === "loading"}
                            className="w-full h-14 rounded-xl bg-white hover:bg-zinc-100 active:scale-[0.98] font-semibold text-zinc-800 text-base transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                            Continuar con Google
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-zinc-700" />
                            <span className="text-xs text-zinc-500">o por email</span>
                            <div className="flex-1 h-px bg-zinc-700" />
                        </div>

                        {/* Email input */}
                        <input
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                            disabled={state === "loading"}
                            className="w-full h-14 rounded-xl bg-zinc-800 border border-zinc-700 px-4 text-base text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                            aria-label="Email para magic link"
                        />

                        {state === "error" && errorMsg && (
                            <p className="mt-2 text-sm text-red-400">{errorMsg}</p>
                        )}

                        <button
                            onClick={handleMagicLink}
                            disabled={state === "loading" || !email.trim()}
                            className="w-full h-14 mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white text-base transition-all disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        >
                            {state === "loading" ? (
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
                            disabled={state === "loading"}
                            className="w-full h-14 mt-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 active:scale-[0.98] font-semibold text-zinc-300 text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Probar demo sin registrarte
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
