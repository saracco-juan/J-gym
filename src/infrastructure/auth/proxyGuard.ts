/**
 * Redirect guard for the Next.js proxy.
 *
 * Decides from the auth cookie alone, with no call to Supabase, so navigation
 * never waits on (or fails because of) the network. Session refresh is done by
 * the browser client. This is only a UX redirect: data is protected by Row
 * Level Security in Supabase, never by this guard.
 */

import { NextResponse, type NextRequest } from "next/server";
import { decideRedirect } from "@/core/auth";
import { hasLocalSession } from "./sessionCookie";

export function guardRequest(request: NextRequest): NextResponse {
    const hasSession = hasLocalSession(request.cookies.getAll());
    const target = decideRedirect(request.nextUrl.pathname, hasSession);
    if (target === null) return NextResponse.next({ request });

    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url);
}
