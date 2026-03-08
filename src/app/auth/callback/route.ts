/**
 * Auth Callback Route — Handles Supabase OAuth/Magic Link redirects.
 *
 * After a user clicks a magic link or completes OAuth,
 * Supabase redirects here with a code that gets exchanged
 * for a session.
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
