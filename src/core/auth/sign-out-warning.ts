/**
 * What the user must be told before signing out.
 *
 * - "anonymous": the account has no email, so after signing out it can never
 *   be opened again from the app. Takes precedence.
 * - "unsynced": changes still waiting in the outbox stay on this device until
 *   the same account signs in again.
 */

export type SignOutWarning = "anonymous" | "unsynced";

export interface SignOutWarningInput {
    isAnonymous: boolean;
    pendingCount: number;
}

export function signOutWarning({ isAnonymous, pendingCount }: SignOutWarningInput): SignOutWarning | null {
    if (isAnonymous) return "anonymous";
    if (pendingCount > 0) return "unsynced";
    return null;
}
