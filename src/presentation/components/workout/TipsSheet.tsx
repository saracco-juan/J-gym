"use client";

/**
 * TipsSheet — technique tips of an exercise in a bottom sheet.
 * Presentational.
 */

import BottomSheet from "@/presentation/components/ui/BottomSheet";

interface TipsSheetProps {
    exerciseName: string;
    tips: readonly string[];
    onClose: () => void;
}

export default function TipsSheet({ exerciseName, tips, onClose }: TipsSheetProps) {
    return (
        <BottomSheet title="Técnica" onClose={onClose}>
            <p className="body-4 text-accent-text">{exerciseName}</p>
            <ul className="body-6 mt-3 flex list-disc flex-col gap-3 pl-6 text-text-secondary">
                {tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                ))}
            </ul>
        </BottomSheet>
    );
}
