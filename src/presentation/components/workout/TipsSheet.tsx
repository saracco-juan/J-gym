"use client";

/**
 * TipsSheet — technique tips of an exercise in a bottom sheet.
 * Presentational.
 */

import Link from "next/link";
import { ChartLineUp } from "@phosphor-icons/react";
import BottomSheet from "@/presentation/components/ui/BottomSheet";

interface TipsSheetProps {
    exerciseName: string;
    tips: readonly string[];
    /** Shows a "Ver historial" action when present. */
    historyHref?: string;
    onClose: () => void;
}

export default function TipsSheet({ exerciseName, tips, historyHref, onClose }: TipsSheetProps) {
    return (
        <BottomSheet title="Técnica" onClose={onClose}>
            <p className="body-4 text-accent-text">{exerciseName}</p>
            <ul className="body-6 mt-3 flex list-disc flex-col gap-3 pl-6 text-text-secondary">
                {tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                ))}
            </ul>
            {historyHref && (
                <Link href={historyHref} className="btn-secondary button-md mt-4 hover:bg-surface-strong active:scale-98">
                    <ChartLineUp size={20} weight="bold" /> Ver historial
                </Link>
            )}
        </BottomSheet>
    );
}
