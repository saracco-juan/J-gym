/**
 * StatusIcon: the training status as an icon with its Spanish label, in the
 * color that matches the mood of the status. Presentational.
 */

import { Equals, Moon, TrendUp, WarningCircle } from "@phosphor-icons/react";
import { STATUS_LABELS, type TrainingStatus } from "@/core/stats";

const ICONS: Record<TrainingStatus, typeof TrendUp> = {
    progressing: TrendUp,
    stagnant: WarningCircle,
    inactive: Moon,
    steady: Equals,
};

export const STATUS_TONES: Record<TrainingStatus, string> = {
    progressing: "text-accent-text",
    stagnant: "text-warning-text",
    inactive: "text-text-muted",
    steady: "text-info-text",
};

interface StatusIconProps {
    status: TrainingStatus;
    size?: number;
    /** Show the label next to the icon (the card); otherwise it is only announced. */
    withLabel?: boolean;
}

export default function StatusIcon({ status, size = 20, withLabel = false }: StatusIconProps) {
    const Icon = ICONS[status];
    return (
        <span className={`inline-flex items-center gap-1 ${STATUS_TONES[status]}`}>
            <Icon size={size} weight="bold" aria-hidden="true" />
            {withLabel ? (
                <span className="body-5">{STATUS_LABELS[status]}</span>
            ) : (
                <span className="sr-only">{STATUS_LABELS[status]}</span>
            )}
        </span>
    );
}
