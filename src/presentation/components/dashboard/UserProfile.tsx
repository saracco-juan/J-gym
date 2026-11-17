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
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { resetUserData } from "@/infrastructure/local/queries";
import { useSyncStore } from "@/presentation/stores/useSyncStore";
import { signOutAndClear } from "@/infrastructure/sync/syncRuntime";
import { getUserDisplay } from "@/core/domain/user-display";
import { SignOut, ArrowCounterClockwise } from "@phosphor-icons/react";

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
    const [resetError, setResetError] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // ─── Fetch user on mount ─────────────────────────────────

    useEffect(() => {
        async function load() {
            const supabase = createSupabaseBrowserClient();
            // getSession reads local storage, so the avatar renders offline.
            const { data: { session } } = await supabase.auth.getSession();
            const authUser = session?.user;
            if (authUser) {
                const display = getUserDisplay({
                    email: authUser.email,
                    fullName: authUser.user_metadata?.full_name,
                    isAnonymous: authUser.is_anonymous,
                });
                setUser({
                    email: display.email,
                    name: display.name,
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
        // Flushes pending writes, signs out, wipes local data only if synced.
        await signOutAndClear();
        router.push("/login");
    }, [router]);

    // ─── Reset ───────────────────────────────────────────────

    const handleReset = useCallback(async () => {
        const confirmed = window.confirm(
            "Esto borrará todas tus rutinas y registros. ¿Querés continuar?"
        );
        if (!confirmed) return;

        const userId = useSyncStore.getState().userId;
        if (!userId) return;

        setIsResetting(true);
        setResetError(null);
        try {
            // Local reset; the deletes reach the server through the outbox.
            await resetUserData(getLocalRepositories(), userId);
            setOpen(false);
            router.push("/onboarding");
        } catch {
            setResetError("No se pudo reiniciar la app. Intentá de nuevo.");
        } finally {
            setIsResetting(false);
        }
    }, [router]);

    // ─── Render ──────────────────────────────────────────────

    if (!user) return null;

    const initial = (user.name || user.email).charAt(0).toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            {/* Avatar button */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="pressable size-12 overflow-hidden rounded-full border-2 border-surface-border hover:border-accent-hover"
                aria-label="Perfil de usuario"
                aria-expanded={open}
                aria-haspopup="menu"
            >
                {user.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="body-4 flex h-full w-full items-center justify-center bg-accent text-text-primary">
                        {initial}
                    </div>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col gap-1 rounded-xl border border-surface-border bg-surface-raised p-2"
                >
                    {/* User info */}
                    <div className="px-3 py-2">
                        <p className="body-4 truncate text-text-primary">{user.name}</p>
                        {user.email && (
                            <p className="caption-5 truncate text-text-muted">{user.email}</p>
                        )}
                    </div>

                    {/* Logout */}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="pressable body-5 flex min-h-12 w-full items-center gap-3 rounded-sm px-3 py-2 text-text-primary hover:bg-surface-strong"
                    >
                        <SignOut size={20} weight="bold" /> Cerrar sesión
                    </button>

                    {/* Reset (development only) */}
                    {process.env.NODE_ENV !== "production" && (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleReset}
                            disabled={isResetting}
                            className="pressable body-5 flex min-h-12 w-full items-center gap-3 rounded-sm px-3 py-2 text-danger-text hover:enabled:bg-surface-strong disabled:opacity-50"
                        >
                            <ArrowCounterClockwise size={20} weight="bold" />
                            {isResetting ? "Reiniciando…" : "Reiniciar app (solo desarrollo)"}
                        </button>
                    )}

                    {resetError && (
                        <p role="alert" className="caption-5 px-3 py-2 text-danger-text">
                            {resetError}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
