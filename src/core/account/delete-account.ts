/**
 * Rules for deleting the whole account. Pure: the caller supplies the online
 * state and what the user typed.
 */

/** What the user must type to arm the destructive button. */
export const DELETE_CONFIRMATION_PHRASE = "ELIMINAR";

/** Surrounding spaces and letter case are ignored (phone keyboards capitalize). */
export function isDeleteConfirmed(typed: string): boolean {
    return typed.trim().toUpperCase() === DELETE_CONFIRMATION_PHRASE;
}

/**
 * Why deleting is not possible yet, or null when it is.
 * - "offline": the account lives on the server, so deleting needs a connection.
 * - "unconfirmed": the phrase has not been typed.
 */
export type DeleteAccountBlock = "offline" | "unconfirmed";

export interface DeleteAccountInput {
    online: boolean;
    typed: string;
}

export function deleteAccountBlock({ online, typed }: DeleteAccountInput): DeleteAccountBlock | null {
    if (!online) return "offline";
    if (!isDeleteConfirmed(typed)) return "unconfirmed";
    return null;
}
