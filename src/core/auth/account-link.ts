/**
 * Rules for linking an email to an anonymous account.
 *
 * Accounts created with the old demo button are anonymous: they own real data
 * but have no email, so signing out (or losing the device) loses them. Linking
 * an email keeps the same user id, so no data moves.
 */

export interface AccountLinkUser {
    isAnonymous?: boolean | null;
}

/** True only for a signed-in anonymous user. */
export function shouldOfferEmailLink(user: AccountLinkUser | null | undefined): boolean {
    return user?.isAnonymous === true;
}
