/**
 * ExerciseStatusBadge — compact status pill of an exercise card.
 * Presentational.
 */

import type { StatusLabel, StatusTone } from "@/core/session";

const TONE_CLASS: Record<StatusTone, string> = {
    success: "bg-accent-soft text-accent-text",
    warning: "bg-warning-soft text-warning-text",
    muted: "bg-surface-strong text-text-secondary",
    info: "bg-info-soft text-info-text",
};

export default function ExerciseStatusBadge({ status }: { status: StatusLabel }) {
    return (
        <span
            className={`caption-3 rounded-full px-2 py-0.5 ${TONE_CLASS[status.tone]}`}
        >
            {status.label}
        </span>
    );
}
