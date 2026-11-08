/**
 * ExerciseStatusBadge — compact status pill of an exercise card.
 * Presentational.
 */

import type { StatusLabel, StatusTone } from "@/core/session";

const TONE_CLASS: Record<StatusTone, string> = {
    success: "bg-emerald-400/10 text-emerald-400",
    warning: "bg-amber-400/10 text-amber-400",
    muted: "bg-zinc-700/50 text-zinc-400",
    info: "bg-sky-400/10 text-sky-400",
};

export default function ExerciseStatusBadge({ status }: { status: StatusLabel }) {
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[status.tone]}`}
        >
            {status.label}
        </span>
    );
}
