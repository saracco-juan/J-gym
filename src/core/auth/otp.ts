/**
 * Pure helpers for the email one-time-code flows (login and email linking).
 * No I/O: the clock and error shapes are passed in so everything is testable.
 */

/**
 * Supabase sends a 6 digit code by default and lets the project raise it up
 * to 10 ("Email OTP length"). The UI accepts the whole range so changing that
 * setting never needs a deploy.
 */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;
export const RESEND_COOLDOWN_SECONDS = 60;

export type AuthErrorKind =
    | "invalid-code"
    | "rate-limit"
    | "email-taken"
    | "network"
    | "unknown";

/** Keeps only digits and caps the length at the longest possible code. */
export function normalizeOtpCode(raw: string): string {
    return raw.replace(/\D/g, "").slice(0, OTP_MAX_LENGTH);
}

/** True when the value is 6 to 10 digits. */
export function isCompleteOtpCode(value: string): boolean {
    return /^\d+$/.test(value) && value.length >= OTP_MIN_LENGTH && value.length <= OTP_MAX_LENGTH;
}

/** Basic shape check (not RFC-complete); the server remains the authority. */
export function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Whole seconds left until the resend cooldown ends, rounded up and clamped
 * to [0, cooldownSeconds] (so a backwards clock never shows more than the cooldown).
 */
export function cooldownRemainingSeconds(
    startedAtMs: number,
    cooldownSeconds: number,
    nowMs: number,
): number {
    const remainingMs = startedAtMs + cooldownSeconds * 1000 - nowMs;
    return Math.min(cooldownSeconds, Math.max(0, Math.ceil(remainingMs / 1000)));
}

interface AuthErrorLike {
    code?: string;
    status?: number;
    name?: string;
    message?: string;
}

const EMAIL_TAKEN_CODES = new Set(["email_exists", "identity_already_exists", "user_already_exists"]);

/** Maps a Supabase auth error to a small union; never exposes raw messages. */
export function classifyAuthError(error: unknown): AuthErrorKind {
    if (!error || typeof error !== "object") return "unknown";
    const { code, status, name, message } = error as AuthErrorLike;

    if (status === 429 || (code && code.includes("rate_limit"))) return "rate-limit";
    if (code && EMAIL_TAKEN_CODES.has(code)) return "email-taken";
    if (code === "otp_expired" || status === 401 || status === 403) return "invalid-code";
    if (
        status === 0 ||
        name === "AuthRetryableFetchError" ||
        (message && /failed to fetch|network/i.test(message))
    ) {
        return "network";
    }
    return "unknown";
}
