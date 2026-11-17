"use client";

/**
 * BackButton — icon button that goes back in history, or to the dashboard when
 * the screen was opened directly. `onBack` replaces that (e.g. to confirm
 * discarding edits first).
 */

import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";

export default function BackButton({ onBack }: { onBack?: () => void }) {
    const router = useRouter();
    const goBack = () => (window.history.length > 1 ? router.back() : router.push("/dashboard"));
    return (
        <button type="button" onClick={onBack ?? goBack} className="btn-icon -ml-3" aria-label="Volver">
            <ArrowLeft size={24} weight="bold" />
        </button>
    );
}
