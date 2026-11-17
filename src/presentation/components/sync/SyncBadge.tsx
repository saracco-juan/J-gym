"use client";

/**
 * SyncBadge: small sync indicator for the dashboard header. Hidden while
 * everything is synced; otherwise says what is going on.
 */

import { CloudSlash, ArrowsClockwise, CloudArrowUp } from "@phosphor-icons/react";
import { useSyncStore } from "@/presentation/stores/useSyncStore";

export default function SyncBadge() {
    const status = useSyncStore((s) => s.status);
    const pendingCount = useSyncStore((s) => s.pendingCount);

    if (status === "idle" && pendingCount === 0) return null;
    if (status === "paused" && pendingCount === 0) return null;

    let label: string;
    let icon: React.ReactNode;
    let tone = "text-text-secondary bg-surface-raised border-surface-border";

    if (status === "syncing") {
        label = "Sincronizando…";
        icon = <ArrowsClockwise size={16} weight="bold" className="pulse-soft" />;
        tone = "text-accent-text bg-accent-soft border-accent-border";
    } else if (status === "offline") {
        label = pendingCount > 0 ? `Sin conexión · ${pendingCount} sin sincronizar` : "Sin conexión";
        icon = <CloudSlash size={16} weight="bold" />;
    } else {
        label = `${pendingCount} sin sincronizar`;
        icon = <CloudArrowUp size={16} weight="bold" />;
    }

    return (
        <span
            role="status"
            className={`caption-4 inline-flex items-center gap-2 rounded-full border px-2 py-1 ${tone}`}
        >
            {icon}
            {label}
        </span>
    );
}
