/**
 * Pure helpers for the email one-time-code login.
 * No I/O: the clock and error shapes are passed in so everything is testable.
 */

export const OTP_LENGTH = 6;
export const RESEND_COOLDOWN_SECONDS = 60;

export type AuthErrorKind = "invalid-code" | "rate-limit" | "network" | "unknown";

/** Keeps only digits and caps the length at the code size. */
export function normalizeOtpCode(raw: string): string {
    return raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

/** True when the value is exactly OTP_LENGTH digits. */
export function isCompleteOtpCode(value: string): boolean {
    return value.length === OTP_LENGTH && /^\d+$/.test(value);
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

/** Maps a Supabase auth error to a small union; never exposes raw messages. */
export function classifyAuthError(error: unknown): AuthErrorKind {
    if (!error || typeof error !== "object") return "unknown";
    const { code, status, name, message } = error as AuthErrorLike;

    if (status === 429 || (code && code.includes("rate_limit"))) return "rate-limit";
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
