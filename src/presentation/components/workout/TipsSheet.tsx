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
            <p className="text-sm font-semibold text-emerald-400">{exerciseName}</p>
            <ul className="mt-3 flex list-disc flex-col gap-3 pl-5 text-sm text-zinc-300">
                {tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                ))}
            </ul>
        </BottomSheet>
    );
}
