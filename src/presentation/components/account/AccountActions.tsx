"use client";

/**
 * Account actions of the profile menu: "Reiniciar datos" and "Eliminar cuenta".
 * `useAccountActions` owns both flows; the menu items render inside the
 * dropdown and the sheets outside it, so closing the menu keeps a sheet alive.
 */

import { ArrowCounterClockwise, Trash } from "@phosphor-icons/react";
import DeleteAccountSheet from "./DeleteAccountSheet";
import ResetDataSheet from "./ResetDataSheet";
import { useDeleteAccount } from "./useDeleteAccount";
import { useResetData } from "./useResetData";

const DANGER_ITEM =
    "pressable body-5 flex min-h-12 w-full items-center gap-3 rounded-sm px-3 py-2 text-danger-text hover:bg-surface-strong";

export function useAccountActions() {
    return { reset: useResetData(), remove: useDeleteAccount() };
}

export type AccountActions = ReturnType<typeof useAccountActions>;

export function AccountMenuItems({
    actions,
    onChosen,
}: {
    actions: AccountActions;
    /** Closes the menu once an item opened its sheet. */
    onChosen: () => void;
}) {
    return (
        <>
            <button
                type="button"
                role="menuitem"
                onClick={() => {
                    onChosen();
                    void actions.reset.start();
                }}
                className={DANGER_ITEM}
            >
                <ArrowCounterClockwise size={20} weight="bold" /> Reiniciar datos
            </button>
            <button
                type="button"
                role="menuitem"
                onClick={() => {
                    onChosen();
                    actions.remove.start();
                }}
                className={DANGER_ITEM}
            >
                <Trash size={20} weight="bold" /> Eliminar cuenta
            </button>
        </>
    );
}

export function AccountSheets({ actions }: { actions: AccountActions }) {
    return (
        <>
            {actions.reset.isOpen && <ResetDataSheet flow={actions.reset} />}
            {actions.remove.isOpen && <DeleteAccountSheet flow={actions.remove} />}
        </>
    );
}
