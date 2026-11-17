/**
 * Current auth user as the UI needs it. Reads the local session (no network),
 * so it also works offline.
 */

import { createSupabaseBrowserClient } from "./browserClient";

export interface SessionUser {
    id: string;
    /** Empty for anonymous users. */
    email: string;
    isAnonymous: boolean;
}

export async function readSessionUser(): Promise<SessionUser | null> {
    try {
        const { data } = await createSupabaseBrowserClient().auth.getSession();
        const user = data.session?.user;
        if (!user) return null;
        return { id: user.id, email: user.email ?? "", isAnonymous: user.is_anonymous === true };
    } catch {
        return null;
    }
}
