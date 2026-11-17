"use client";

/**
 * ProfileForm: display name and avatar color with a live avatar preview.
 *
 * Offline first: saving writes to the local database and the outbox, then
 * (when online) waits briefly for the sync so a name taken by someone else is
 * reported right here. Offline, or when the sync is slow, the same message
 * shows up later in the profile menu.
 */

import { useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { IProfile } from "@/core/domain";
import {
    AVATAR_COLORS,
    DEFAULT_AVATAR_COLOR,
    DISPLAY_NAME_MAX_LENGTH,
    DISPLAY_NAME_MIN_LENGTH,
    validateDisplayName,
    type DisplayNameError,
} from "@/core/profile";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { getSyncEngine } from "@/infrastructure/sync/syncRuntime";
import Avatar from "@/presentation/components/ui/Avatar";
import BackButton from "@/presentation/components/ui/BackButton";
import {
    isNameRejected,
    refreshProfile,
    useProfileStore,
} from "@/presentation/stores/useProfileStore";
import { Check } from "@phosphor-icons/react";

/** How long saving waits for the server's answer before moving on. */
const SYNC_WAIT_MS = 4000;

const COLOR_NAMES: Record<string, string> = {
    "#059669": "Esmeralda",
    "#0d9488": "Verde azulado",
    "#0284c7": "Celeste",
    "#2563eb": "Azul",
    "#7c3aed": "Violeta",
    "#c026d3": "Fucsia",
    "#db2777": "Rosa",
    "#ea580c": "Naranja",
};

const NAME_ERRORS: Record<DisplayNameError, string> = {
    empty: "Escribí un nombre.",
    "too-short": `Usá al menos ${DISPLAY_NAME_MIN_LENGTH} caracteres.`,
    "too-long": `Usá hasta ${DISPLAY_NAME_MAX_LENGTH} caracteres.`,
    "invalid-chars": "Usá solo letras, números, espacios, punto, guion y guion bajo.",
};

const NAME_TAKEN = "Ese nombre ya está en uso. Elegí otro.";

interface ProfileFormProps {
    userId: string;
    /** The profile stored on the device, or null the first time. */
    profile: IProfile | null;
}

export default function ProfileForm({ userId, profile }: ProfileFormProps) {
    const router = useRouter();
    const nameId = useId();
    const errorId = useId();
    const isNew = profile === null;
    const [name, setName] = useState(profile?.displayName ?? "");
    const [color, setColor] = useState<string>(profile?.avatarColor ?? DEFAULT_AVATAR_COLOR);
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [takenName, setTakenName] = useState<string | null>(null);
    const storedRejected = useProfileStore(isNameRejected);
    const storedName = profile?.displayName ?? "";

    const result = validateDisplayName(name);
    // The server refused this exact name earlier (now, or on a previous sync).
    const rejected =
        (takenName !== null && takenName === name.trim()) ||
        (storedRejected && storedName === name.trim());
    const error = rejected
        ? NAME_TAKEN
        : touched && !result.ok
          ? NAME_ERRORS[result.reason]
          : "";

    const handleSubmit = useCallback(async () => {
        setTouched(true);
        const checked = validateDisplayName(name);
        if (!checked.ok || rejected) return;

        setSaving(true);
        const next: IProfile = { userId, displayName: checked.value, avatarColor: color };
        const unchanged =
            profile?.displayName === next.displayName && profile.avatarColor === next.avatarColor;
        if (!unchanged) {
            await getLocalRepositories().profiles.save(next);
            await refreshProfile(userId);
            if (typeof navigator === "undefined" || navigator.onLine) {
                await Promise.race([
                    getSyncEngine().flush().catch(() => undefined),
                    new Promise((resolve) => setTimeout(resolve, SYNC_WAIT_MS)),
                ]);
                await refreshProfile(userId);
                if (isNameRejected(useProfileStore.getState())) {
                    setTakenName(next.displayName);
                    setSaving(false);
                    return;
                }
            }
        }
        router.replace("/dashboard");
    }, [color, name, profile, rejected, router, userId]);

    return (
        <form
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
            }}
            className="flex flex-col gap-6 px-4 py-4"
        >
            <div className="flex flex-col gap-2">
                {!isNew && <BackButton />}
                <h1 className="heading-5 text-text-primary">
                    {isNew ? "Creá tu perfil" : "Editar perfil"}
                </h1>
                <p className="body-6 text-text-secondary">
                    {isNew
                        ? "Elegí cómo te van a ver los demás en el ranking."
                        : "Así te ven los demás en el ranking."}
                </p>
            </div>

            <div className="flex justify-center">
                <Avatar name={name.trim() || "?"} color={color} size="xl" />
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor={nameId} className="body-5 text-text-primary">
                    Nombre
                </label>
                <input
                    id={nameId}
                    type="text"
                    autoComplete="nickname"
                    autoCapitalize="words"
                    maxLength={DISPLAY_NAME_MAX_LENGTH + 8}
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setTakenName(null);
                    }}
                    onBlur={() => setTouched(true)}
                    disabled={saving}
                    className="field"
                    aria-invalid={error !== ""}
                    aria-describedby={errorId}
                />
                <p
                    id={errorId}
                    role={error ? "alert" : undefined}
                    className={`body-6 ${error ? "text-danger-text" : "text-text-muted"}`}
                >
                    {error ||
                        `Entre ${DISPLAY_NAME_MIN_LENGTH} y ${DISPLAY_NAME_MAX_LENGTH} caracteres. Letras, números, espacios, punto, guion y guion bajo.`}
                </p>
            </div>

            <fieldset className="flex flex-col gap-3">
                <legend className="body-5 mb-1 text-text-primary">Color del avatar</legend>
                <div role="radiogroup" aria-label="Color del avatar" className="grid grid-cols-4 gap-3">
                    {AVATAR_COLORS.map((c) => {
                        const selected = c === color;
                        return (
                            <button
                                key={c}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={COLOR_NAMES[c] ?? c}
                                disabled={saving}
                                onClick={() => setColor(c)}
                                style={{ backgroundColor: c }}
                                className={`pressable flex size-12 items-center justify-center justify-self-center rounded-full text-text-primary outline-offset-2 ${
                                    selected ? "outline-2 outline-text-primary" : ""
                                }`}
                            >
                                {selected && <Check size={20} weight="bold" />}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <button
                type="submit"
                disabled={saving || name.trim() === ""}
                aria-busy={saving}
                className="btn-primary w-full button-md"
            >
                {saving ? "Guardando…" : "Guardar"}
            </button>
        </form>
    );
}
