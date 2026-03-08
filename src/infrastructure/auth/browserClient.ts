/**
 * Supabase Browser Client — For use in Client Components.
 *
 * Creates a singleton Supabase client for browser-side operations
 * like triggering OAuth flows or magic link login.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
