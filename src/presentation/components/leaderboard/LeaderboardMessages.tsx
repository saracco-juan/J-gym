/**
 * Composed messages of the leaderboard: nobody published yet, a failed load
 * and the prompt for accounts that cannot join yet. Presentational.
 */

import Link from "next/link";
import { Envelope, Trophy, UserCircle, WarningCircle } from "@phosphor-icons/react";

function IconBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex size-16 items-center justify-center rounded-xl border border-surface-border bg-surface-raised text-text-muted">
            {children}
        </div>
    );
}

export function LeaderboardEmpty() {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <IconBox>
                <Trophy size={32} weight="bold" aria-hidden="true" />
            </IconBox>
            <h2 className="title-2 text-text-primary">Todavía nadie publicó sus números</h2>
            <p className="body-6 max-w-xs text-text-secondary">
                Cuando alguien termine un entrenamiento, su racha y su volumen aparecen acá.
            </p>
        </div>
    );
}

export function LeaderboardError({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-danger-border bg-danger-soft px-4 py-3"
        >
            <p className="body-6 flex items-start gap-2 text-danger-text">
                <WarningCircle size={20} weight="bold" aria-hidden="true" className="shrink-0" />
                No se pudo cargar la tabla. Revisá tu conexión e intentá de nuevo.
            </p>
            <button type="button" onClick={onRetry} className="btn-secondary button-sm self-start">
                Reintentar
            </button>
        </div>
    );
}

/** Shown instead of the table to accounts that cannot appear on it yet. */
export function LeaderboardPrompt({ reason }: { reason: "link-email" | "setup-profile" }) {
    const isEmail = reason === "link-email";
    const Icon = isEmail ? Envelope : UserCircle;
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <IconBox>
                <Icon size={32} weight="bold" aria-hidden="true" />
            </IconBox>
            <div className="flex flex-col gap-2">
                <h2 className="title-2 text-text-primary">
                    {isEmail ? "Vinculá tu email para ver la tabla" : "Creá tu perfil para ver la tabla"}
                </h2>
                <p className="body-6 max-w-xs text-text-secondary">
                    {isEmail
                        ? "La tabla es para cuentas con email y perfil. Tus rutinas y registros se mantienen: es la misma cuenta."
                        : "Elegí un nombre y un color para que los demás te vean en la tabla."}
                </p>
            </div>
            <Link href="/profile" className="btn-primary button-md">
                {isEmail ? "Vincular email" : "Crear perfil"}
            </Link>
        </div>
    );
}
