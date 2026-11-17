/**
 * StagnationNotice — warning badge for an exercise that failed its last
 * sessions. Presentational. It states the fact only: weight changes are
 * always manual (AGENTS.md rule 1), so it never proposes kilos.
 */

import { Warning } from "@phosphor-icons/react";
import { STAGNATION_MESSAGE } from "@/core/progress";

export default function StagnationNotice() {
    return (
        <div className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-soft px-3 py-2">
            <Warning size={16} weight="bold" className="mt-0.5 shrink-0 text-warning-text" aria-hidden="true" />
            <div className="min-w-0">
                <p className="caption-3 text-warning-text">Estancado</p>
                <p className="caption-5 text-text-secondary">{STAGNATION_MESSAGE}</p>
            </div>
        </div>
    );
}
