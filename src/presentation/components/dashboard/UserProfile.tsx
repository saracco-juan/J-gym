"use client";

/**
 * UserProfile — Avatar + dropdown con logout y reset.
 *
 * Muestra avatar de Google o inicial del email.
 * Mobile-first: compact, tap-friendly.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/browserClient";
import { resetUserAppData } from "@/app/actions/debugActions";
import { LogOut, RotateCcw } from "lucide-react";

interface UserInfo {
    email: string;
    name: string;
    avatarUrl: string | null;
}

export default function UserProfile() {
    const router = useRouter();
    const [user, setUser] = useState<UserInfo | null>(null);
    const [open, setOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // ─── Fetch user on mount ─────────────────────────────────

    useEffect(() => {
        async function load() {
            const supabase = createSupabaseBrowserClient();
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                setUser({
                    email: authUser.email ?? "",
                    name: authUser.user_metadata?.full_name ?? authUser.email ?? "",
                    avatarUrl: authUser.user_metadata?.avatar_url ?? null,
                });
            }
        }
        load();
    }, []);

    // ─── Close on outside click ──────────────────────────────

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    // ─── Logout ──────────────────────────────────────────────

    const handleLogout = useCallback(async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push("/login");
    }, [router]);

    // ─── Reset ───────────────────────────────────────────────

    const handleReset = useCallback(async () => {
        const confirmed = window.confirm(
            "ATENCIÓN: Esto borrará TODAS tus rutinas y registros. ¿Estás seguro?"
        );
        if (!confirmed) return;

        setIsResetting(true);
        const result = await resetUserAppData();
        setIsResetting(false);
        setOpen(false);

        if (result.success) {
            router.push("/onboarding");
        } else {
            alert(result.error ?? "Error al resetear.");
        }
    }, [router]);

    // ─── Render ──────────────────────────────────────────────

    if (!user) return null;

    const initial = (user.name || user.email).charAt(0).toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            {/* Avatar button */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-zinc-700 hover:border-emerald-500 transition-all active:scale-95"
                aria-label="Perfil de usuario"
            >
                {user.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        {initial}
                    </div>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-12 w-56 rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl shadow-black/40 py-2 z-50">
                    {/* User info */}
                    <div className="px-4 py-2 border-b border-zinc-800">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-all"
                    >
                        <LogOut size={16} /> Cerrar Sesión
                    </button>

                    {/* Reset (development only) */}
                    {process.env.NODE_ENV !== "production" && (
                        <button
                            onClick={handleReset}
                            disabled={isResetting}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition-all disabled:opacity-50"
                        >
                            <RotateCcw size={16} className={isResetting ? "animate-spin" : ""} />
                            {isResetting ? "Reseteando..." : "Reset App (Dev)"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
