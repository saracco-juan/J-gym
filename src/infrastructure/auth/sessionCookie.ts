/**
 * Local (no network) check for a Supabase auth session cookie.
 *
 * `@supabase/ssr` stores the session as `sb-<ref>-auth-token`, either raw JSON
 * or `base64-` + base64url(JSON), split into `.0`, `.1`, ... chunks when large.
 *
 * The check only looks for a well-formed session with tokens. An expired
 * access token still counts: the browser client refreshes it. This is a UX
 * hint for redirects, never an authorization decision (RLS does that).
 */

export interface CookieLike {
    name: string;
    value: string;
}

const COOKIE_NAME = /^(sb-.+-auth-token)(?:\.(\d+))?$/;
const BASE64_PREFIX = "base64-";

function decodeSession(raw: string): unknown {
    const json = raw.startsWith(BASE64_PREFIX)
        ? Buffer.from(raw.slice(BASE64_PREFIX.length), "base64url").toString("utf-8")
        : raw;
    return JSON.parse(json);
}

function isSessionLike(value: unknown): boolean {
    if (typeof value !== "object" || value === null) return false;
    const { access_token, refresh_token } = value as Record<string, unknown>;
    return (
        typeof access_token === "string" &&
        access_token.length > 0 &&
        typeof refresh_token === "string" &&
        refresh_token.length > 0
    );
}

export function hasLocalSession(cookies: readonly CookieLike[]): boolean {
    const groups = new Map<string, { index: number; value: string }[]>();
    for (const { name, value } of cookies) {
        const match = COOKIE_NAME.exec(name);
        if (!match) continue;
        const chunks = groups.get(match[1]) ?? [];
        chunks.push({ index: match[2] === undefined ? 0 : Number(match[2]), value });
        groups.set(match[1], chunks);
    }

    for (const chunks of groups.values()) {
        const raw = chunks
            .sort((a, b) => a.index - b.index)
            .map((c) => c.value)
            .join("");
        try {
            if (isSessionLike(decodeSession(raw))) return true;
        } catch {
            // Malformed cookie: treat as signed out.
        }
    }
    return false;
}
