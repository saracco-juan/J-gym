/** Minimal user data needed to decide how to present a user in the UI. */
export interface UserDisplayInput {
    email?: string | null;
    fullName?: string | null;
    isAnonymous?: boolean;
}

export interface UserDisplay {
    name: string;
    email: string;
    isDemo: boolean;
}

/** Anonymous (demo) users have no email, so they get a fixed label. */
export function getUserDisplay(input: UserDisplayInput): UserDisplay {
    if (input.isAnonymous) {
        return { name: "Usuario demo", email: "", isDemo: true };
    }
    const email = input.email ?? "";
    return { name: input.fullName || email, email, isDemo: false };
}
