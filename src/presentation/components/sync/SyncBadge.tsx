"use client";

/**
 * SyncBadge: small sync indicator for the dashboard header. Hidden while
 * everything is synced; otherwise says what is going on.
 */

import { CloudOff, RefreshCw, UploadCloud } from "lucide-react";
import { useSyncStore } from "@/presentation/stores/useSyncStore";

export default function SyncBadge() {
    const status = useSyncStore((s) => s.status);
    const pendingCount = useSyncStore((s) => s.pendingCount);

    if (status === "idle" && pendingCount === 0) return null;
    if (status === "paused" && pendingCount === 0) return null;

    let label: string;
    let icon: React.ReactNode;
    let tone = "text-zinc-400 bg-zinc-800/60 border-zinc-700/60";

    if (status === "syncing") {
        label = "Sincronizando…";
        icon = <RefreshCw size={12} className="animate-spin" />;
        tone = "text-emerald-400 bg-emerald-950/40 border-emerald-900/60";
    } else if (status === "offline") {
        label = pendingCount > 0 ? `Sin conexión · ${pendingCount} sin sincronizar` : "Sin conexión";
        icon = <CloudOff size={12} />;
    } else {
        label = `${pendingCount} sin sincronizar`;
        icon = <UploadCloud size={12} />;
    }

    return (
        <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}
        >
            {icon}
            {label}
        </span>
    );
}
