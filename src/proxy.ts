/**
 * Next.js Proxy (formerly Middleware) — Supabase session refresh & route protection.
 *
 * Intercepts all requests to:
 * 1. Refresh the Supabase auth session (extend cookie TTL).
 * 2. Redirect unauthenticated users away from protected routes.
 * 3. Redirect authenticated users away from login/root pages.
 *
 * PWA files (manifest, SW, icons) are excluded via the matcher.
 */

import { type NextRequest } from "next/server";
import { updateSession } from "@/infrastructure/auth/middlewareClient";

export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon file)
         * - PWA files (manifest.json, sw.js, workbox-*.js, icons/)
         * - public assets (svg, png, jpg, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
