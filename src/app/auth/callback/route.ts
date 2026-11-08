/**
 * Auth Callback Route — Handles Supabase redirects that carry a code.
 *
 * Login now uses a 6-digit email code (see LoginView), so nothing generates
 * new magic links. This route is kept so links already sent still work.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/infrastructure/auth/serverClient";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Return the user to login with an error
    return NextResponse.redirect(`${origin}/login?error=auth`);
}
