"use client";

/** Calm confirmation on the login screen after the account was deleted (`?deleted=1`). */

import { useSearchParams } from "next/navigation";

export default function DeletedNotice() {
    const deleted = useSearchParams().get("deleted") === "1";
    if (!deleted) return null;
    return (
        <p
            role="status"
            className="body-6 mb-4 w-full max-w-sm rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-text-secondary"
        >
            Tu cuenta fue eliminada.
        </p>
    );
}
