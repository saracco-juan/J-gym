"use client";

/**
 * UserProfile — Avatar + dropdown con perfil, rutina, logout y reset.
 *
 * El avatar muestra las iniciales del perfil sobre el color elegido; sin
 * perfil, la inicial del nombre o del email. Las cuentas anónimas ven la
 * opción de vincular un email en lugar de editar el perfil.
 * Mobile-first: compact, tap-friendly.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { resetUserData } from "@/infrastructure/local/queries";
import { useSyncStore } from "@/presentation/stores/useSyncStore";
import { useAuthStore } from "@/presentation/stores/useAuthStore";
import { isNameRejected, useProfileStore } from "@/presentation/stores/useProfileStore";
import { signOutAndClear } from "@/infrastructure/sync/syncRuntime";
import { getUserDisplay } from "@/core/domain/user-display";
import { shouldOfferEmailLink } from "@/core/auth";
import { DEFAULT_AVATAR_COLOR } from "@/core/profile";
import Avatar from "@/presentation/components/ui/Avatar";
import LinkEmailSheet from "@/presentation/components/auth/LinkEmailSheet";
import {
    SignOut,
    ArrowCounterClockwise,
    PencilSimple,
    UserCircle,
    Envelope,
    Trophy,
} from "@phosphor-icons/react";

const MENU_ITEM =
    "pressable body-5 flex min-h-12 w-full items-center gap-3 rounded-sm px-3 py-2 text-text-primary hover:bg-surface-strong";

export default function UserProfile() {
    const router = useRouter();
    const authUser = useAuthStore((s) => s.user);
    const profile = useProfileStore((s) => s.profile);
    const nameRejected = useProfileStore(isNameRejected);
    const [open, setOpen] = useState(false);
    const [linking, setLinking] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

    if (!authUser) return null;

    const display = getUserDisplay({
        email: authUser.email,
        isAnonymous: authUser.isAnonymous,
    });
    const name = profile?.displayName ?? display.name;
    const isAnonymous = shouldOfferEmailLink(authUser);

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
                <Avatar
                    name={name}
                    color={profile?.avatarColor ?? DEFAULT_AVATAR_COLOR}
                    size="fill"
                />
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col gap-1 rounded-xl border border-surface-border bg-surface-raised p-2"
                >
                    {/* User info */}
                    <div className="px-3 py-2">
                        <p className="body-4 truncate text-text-primary">{name}</p>
                        {display.email && (
                            <p className="caption-5 truncate text-text-muted">{display.email}</p>
                        )}
                    </div>

                    {/* Link an email (anonymous) or edit the profile */}
                    {isAnonymous ? (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                setLinking(true);
                            }}
                            className={MENU_ITEM}
                        >
                            <Envelope size={20} weight="bold" /> Vincular email
                        </button>
                    ) : (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => router.push("/profile")}
                            className={MENU_ITEM}
                        >
                            <UserCircle size={20} weight="bold" /> Editar perfil
                        </button>
                    )}
                    {nameRejected && (
                        <p role="alert" className="caption-5 px-3 pb-1 text-danger-text">
                            Ese nombre ya está en uso. Elegí otro en tu perfil.
                        </p>
                    )}

                    {/* Leaderboard */}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => router.push("/leaderboard")}
                        className={MENU_ITEM}
                    >
                        <Trophy size={20} weight="bold" /> Tabla del gym
                    </button>

                    {/* Routine editor */}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => router.push("/routine")}
                        className={MENU_ITEM}
                    >
                        <PencilSimple size={20} weight="bold" /> Editar rutina
                    </button>

                    {/* Logout */}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className={MENU_ITEM}
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

            {linking && <LinkEmailSheet onClose={() => setLinking(false)} />}
        </div>
    );
}
