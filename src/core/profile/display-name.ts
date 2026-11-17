/**
 * Display name rules. The server enforces length and uniqueness too (see
 * migration 0004); this is the friendly early check.
 */

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 24;

export type DisplayNameError = "empty" | "too-short" | "too-long" | "invalid-chars";

export type DisplayNameResult =
    | { ok: true; value: string }
    | { ok: false; reason: DisplayNameError };

/** Letters (any language), numbers, spaces and . _ - */
const ALLOWED = /^[\p{L}\p{N} ._-]+$/u;
/** At least one letter or number, so "._-" alone is not a name. */
const HAS_ALPHANUMERIC = /[\p{L}\p{N}]/u;

/** Trims, collapses repeated spaces and checks length and characters. */
export function validateDisplayName(raw: string): DisplayNameResult {
    const value = raw.trim().replace(/ {2,}/g, " ");
    if (value === "") return { ok: false, reason: "empty" };
    if (!ALLOWED.test(value) || !HAS_ALPHANUMERIC.test(value)) {
        return { ok: false, reason: "invalid-chars" };
    }
    const length = Array.from(value).length;
    if (length < DISPLAY_NAME_MIN_LENGTH) return { ok: false, reason: "too-short" };
    if (length > DISPLAY_NAME_MAX_LENGTH) return { ok: false, reason: "too-long" };
    return { ok: true, value };
}
