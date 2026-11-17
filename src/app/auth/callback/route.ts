/**
 * Auth Callback Route: handles Supabase redirects that carry a `code`.
 *
 * Login now uses a one-time code typed inside the app (see LoginView), so
 * nothing generates new magic links. This route is kept so links already
 * sent keep working: the code in the URL is exchanged for a session.
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
