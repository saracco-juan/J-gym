"use client";

/**
 * ConfirmSheet — confirmation in a bottom sheet, for actions that discard or
 * remove something. Presentational. Never a window.confirm.
 */

import BottomSheet from "./BottomSheet";

interface ConfirmSheetProps {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    /** Styles the confirm button as a removal. */
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmSheet({
    title,
    message,
    confirmLabel,
    cancelLabel,
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmSheetProps) {
    return (
        <BottomSheet title={title} onClose={onCancel}>
            <p className="body-6 text-text-secondary">{message}</p>
            <div className="mt-4 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={onConfirm}
                    className={
                        destructive
                            ? "btn border border-danger-border bg-danger-soft button-md text-danger-text hover:enabled:bg-surface-strong"
                            : "btn-primary button-md"
                    }
                >
                    {confirmLabel}
                </button>
                <button type="button" onClick={onCancel} className="btn-secondary button-md">
                    {cancelLabel}
                </button>
            </div>
        </BottomSheet>
    );
}
