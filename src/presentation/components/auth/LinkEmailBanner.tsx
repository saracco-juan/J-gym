"use client";

/**
 * LinkEmailBanner: calm, persistent notice for anonymous accounts on the
 * dashboard. It stays until an email is linked (there is no dismiss: the data
 * of an anonymous account is lost on sign-out). Renders nothing otherwise.
 */

import { useState } from "react";
import { shouldOfferEmailLink } from "@/core/auth";
import { useAuthStore } from "@/presentation/stores/useAuthStore";
import { Envelope } from "@phosphor-icons/react";
import LinkEmailSheet from "./LinkEmailSheet";

export default function LinkEmailBanner() {
    const user = useAuthStore((s) => s.user);
    const [open, setOpen] = useState(false);

    const offer = shouldOfferEmailLink(user);
    // Keep the sheet alive while open: linking the email ends the offer, but
    // the sheet still has to show its confirmation.
    if (!offer && !open) return null;

    return (
        <>
            {offer && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="pressable mx-4 flex min-h-12 items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-left hover:enabled:bg-surface-strong"
                >
                    <Envelope size={24} weight="bold" className="shrink-0 text-info-text" />
                    <span className="flex flex-col">
                        <span className="body-4 text-text-primary">
                            Vinculá tu email para no perder tus datos
                        </span>
                        <span className="caption-5 text-text-secondary">
                            Tu cuenta no tiene email. Tocá para vincularlo.
                        </span>
                    </span>
                </button>
            )}
            {open && <LinkEmailSheet onClose={() => setOpen(false)} />}
        </>
    );
}
