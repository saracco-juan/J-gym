/**
 * Next.js Proxy (formerly Middleware) — UX redirects based on the auth cookie.
 *
 * 1. Signed-out visitors on protected routes (and `/`) go to /login.
 * 2. Signed-in visitors on `/` or /login go to /dashboard.
 *
 * The decision is local (cookie only, no network call). It is NOT a security
 * boundary: data access is enforced by Row Level Security in Supabase.
 *
 * PWA files (manifest, SW, icons) are excluded via the matcher.
 */

import { type NextRequest } from "next/server";
import { guardRequest } from "@/infrastructure/auth/proxyGuard";

export function proxy(request: NextRequest) {
    return guardRequest(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon file)
         * - PWA files (manifest.json, sw.js, swe-worker-*.js, icons/)
         * - public assets (svg, png, jpg, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|swe-worker-.*\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
