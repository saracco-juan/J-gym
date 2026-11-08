"use client";

/**
 * BottomSheet — accessible modal dialog anchored to the bottom on phones.
 *
 * Presentational: render it only while open. Moves focus into the dialog,
 * keeps Tab inside it, closes on Escape or overlay tap, locks page scroll and
 * restores the previously focused element on close.
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
    /** Use the full available height (e.g. long searchable lists). */
    tall?: boolean;
}

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function BottomSheet({ title, onClose, children, tall = false }: BottomSheetProps) {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        panelRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (event.key !== "Tab" || !panelRef.current) return;
            const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (items.length === 0) {
                event.preventDefault();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && (active === first || active === panelRef.current)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`relative flex w-full max-w-md flex-col rounded-t-2xl border border-zinc-700 bg-zinc-900 shadow-2xl outline-none sm:rounded-2xl ${
                    tall ? "h-[85dvh]" : "max-h-[85dvh]"
                }`}
            >
                <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-2">
                    <h2 id={titleId} className="text-lg font-bold text-white">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    {children}
                </div>
            </div>
        </div>
    );
}
