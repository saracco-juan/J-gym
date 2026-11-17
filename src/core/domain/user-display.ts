/** Minimal user data needed to decide how to present a user in the UI. */
export interface UserDisplayInput {
    email?: string | null;
    fullName?: string | null;
    isAnonymous?: boolean;
}

export interface UserDisplay {
    name: string;
    email: string;
    isAnonymous: boolean;
}

/** Anonymous users have no email, so they get a fixed label. */
export function getUserDisplay(input: UserDisplayInput): UserDisplay {
    if (input.isAnonymous) {
        return { name: "Cuenta sin email", email: "", isAnonymous: true };
    }
    const email = input.email ?? "";
    return { name: input.fullName || email, email, isAnonymous: false };
}
