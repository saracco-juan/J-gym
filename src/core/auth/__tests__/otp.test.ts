import {
    classifyAuthError,
    cooldownRemainingSeconds,
    isValidEmail,
    normalizeOtpCode,
    isCompleteOtpCode,
    OTP_MAX_LENGTH,
    OTP_MIN_LENGTH,
} from "../otp";

describe("normalizeOtpCode", () => {
    it("strips spaces and non-digits", () => {
        expect(normalizeOtpCode(" 123 456 ")).toBe("123456");
        expect(normalizeOtpCode("12-34ab56")).toBe("123456");
    });

    it("truncates to the longest code the server can send", () => {
        expect(normalizeOtpCode("123456789012")).toBe("1234567890");
    });

    it("keeps codes of every allowed length intact", () => {
        expect(normalizeOtpCode("12345678")).toBe("12345678");
    });

    it("returns an empty string for no digits", () => {
        expect(normalizeOtpCode("abc")).toBe("");
    });
});

describe("isCompleteOtpCode", () => {
    it("accepts 6 to 10 digits (the server length is configurable)", () => {
        expect(OTP_MIN_LENGTH).toBe(6);
        expect(OTP_MAX_LENGTH).toBe(10);
        expect(isCompleteOtpCode("123456")).toBe(true);
        expect(isCompleteOtpCode("12345678")).toBe(true);
        expect(isCompleteOtpCode("1234567890")).toBe(true);
    });

    it("rejects shorter, longer or non-numeric input", () => {
        expect(isCompleteOtpCode("12345")).toBe(false);
        expect(isCompleteOtpCode("12345678901")).toBe(false);
        expect(isCompleteOtpCode("12345a")).toBe(false);
        expect(isCompleteOtpCode("")).toBe(false);
    });
});

describe("isValidEmail", () => {
    it("accepts basic emails and trims whitespace", () => {
        expect(isValidEmail("a@b.co")).toBe(true);
        expect(isValidEmail("  user@example.com ")).toBe(true);
    });

    it("rejects malformed emails", () => {
        expect(isValidEmail("")).toBe(false);
        expect(isValidEmail("user")).toBe(false);
        expect(isValidEmail("user@")).toBe(false);
        expect(isValidEmail("@example.com")).toBe(false);
        expect(isValidEmail("user@example")).toBe(false);
        expect(isValidEmail("us er@example.com")).toBe(false);
    });
});

describe("cooldownRemainingSeconds", () => {
    it("rounds up the remaining time", () => {
        expect(cooldownRemainingSeconds(1_000, 60, 1_000)).toBe(60);
        expect(cooldownRemainingSeconds(1_000, 60, 1_001)).toBe(60);
        expect(cooldownRemainingSeconds(1_000, 60, 1_000 + 59_500)).toBe(1);
    });

    it("never goes below zero", () => {
        expect(cooldownRemainingSeconds(1_000, 60, 1_000 + 60_000)).toBe(0);
        expect(cooldownRemainingSeconds(1_000, 60, 1_000 + 120_000)).toBe(0);
    });

    it("handles a clock that moved backwards by capping at the cooldown", () => {
        expect(cooldownRemainingSeconds(10_000, 60, 5_000)).toBe(60);
    });
});

describe("classifyAuthError", () => {
    it("detects rate limits by code or status", () => {
        expect(classifyAuthError({ code: "over_email_send_rate_limit" })).toBe("rate-limit");
        expect(classifyAuthError({ code: "over_request_rate_limit" })).toBe("rate-limit");
        expect(classifyAuthError({ status: 429 })).toBe("rate-limit");
    });

    it("detects invalid or expired codes", () => {
        expect(classifyAuthError({ code: "otp_expired" })).toBe("invalid-code");
        expect(classifyAuthError({ status: 403, code: "otp_expired" })).toBe("invalid-code");
        expect(classifyAuthError({ status: 401 })).toBe("invalid-code");
        expect(classifyAuthError({ status: 403 })).toBe("invalid-code");
    });

    it("detects network failures", () => {
        expect(classifyAuthError({ name: "AuthRetryableFetchError", status: 0 })).toBe("network");
        expect(classifyAuthError({ message: "Failed to fetch" })).toBe("network");
        expect(classifyAuthError({ status: 0 })).toBe("network");
    });

    it("detects an email that already belongs to another account", () => {
        expect(classifyAuthError({ code: "email_exists", status: 422 })).toBe("email-taken");
        expect(classifyAuthError({ code: "identity_already_exists" })).toBe("email-taken");
        expect(classifyAuthError({ code: "user_already_exists" })).toBe("email-taken");
    });

    it("falls back to unknown", () => {
        expect(classifyAuthError({ status: 500 })).toBe("unknown");
        expect(classifyAuthError({})).toBe("unknown");
        expect(classifyAuthError(null)).toBe("unknown");
    });
});
