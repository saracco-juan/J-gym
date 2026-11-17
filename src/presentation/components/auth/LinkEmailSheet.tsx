"use client";

/**
 * LinkEmailSheet: the email linking flow in a bottom sheet. Render it only
 * while open (the dashboard banner and the profile menu both open it).
 */

import BottomSheet from "@/presentation/components/ui/BottomSheet";
import LinkEmailFlow from "./LinkEmailFlow";

export default function LinkEmailSheet({ onClose }: { onClose: () => void }) {
    return (
        <BottomSheet title="Vinculá tu email" onClose={onClose}>
            <LinkEmailFlow onDone={onClose} />
        </BottomSheet>
    );
}
