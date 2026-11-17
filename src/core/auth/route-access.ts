/**
 * Pure redirect rules for the proxy. They only decide where a visitor should
 * land (UX). They are NOT a security boundary: data access is enforced by
 * Row Level Security in Supabase.
 */

export type RouteKind = "protected" | "auth" | "root" | "public";

const PROTECTED_PREFIXES = ["/dashboard", "/workout", "/onboarding", "/history", "/routine", "/profile"];
const AUTH_PREFIXES = ["/login"];

const matchesPrefix = (pathname: string, prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);

export function classifyRoute(pathname: string): RouteKind {
    if (pathname === "/") return "root";
    if (PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p))) return "protected";
    if (AUTH_PREFIXES.some((p) => matchesPrefix(pathname, p))) return "auth";
    return "public";
}

/** Returns the path to redirect to, or `null` to let the request through. */
export function decideRedirect(pathname: string, hasSession: boolean): string | null {
    const kind = classifyRoute(pathname);
    if (!hasSession && (kind === "protected" || kind === "root")) return "/login";
    if (hasSession && (kind === "auth" || kind === "root")) return "/dashboard";
    return null;
}
