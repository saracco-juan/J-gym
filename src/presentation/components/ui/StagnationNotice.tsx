/**
 * StagnationNotice — warning badge with the suggested next step for an
 * exercise that failed its last sessions. Presentational.
 */

import { Warning } from "@phosphor-icons/react";

interface StagnationNoticeProps {
    /** Spanish suggestion text; the badge alone shows when there is none. */
    suggestion?: string | null;
}

export default function StagnationNotice({ suggestion }: StagnationNoticeProps) {
    return (
        <div className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-soft px-3 py-2">
            <Warning size={16} weight="bold" className="mt-0.5 shrink-0 text-warning-text" aria-hidden="true" />
            <div className="min-w-0">
                <p className="caption-3 text-warning-text">Estancado</p>
                {suggestion && <p className="caption-5 text-text-secondary">{suggestion}</p>}
            </div>
        </div>
    );
}
