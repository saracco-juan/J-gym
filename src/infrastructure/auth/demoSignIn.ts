/**
 * Demo sign-in — Supabase anonymous authentication (browser only).
 *
 * Creates a temporary user without email so visitors can try the app.
 */

import { createSupabaseBrowserClient } from "./browserClient";

export async function signInAsDemo(): Promise<{ success: boolean }> {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInAnonymously();
    return { success: !error };
}
