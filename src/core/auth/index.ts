export { classifyRoute, decideRedirect } from "./route-access";
export type { RouteKind } from "./route-access";
export {
    OTP_MAX_LENGTH,
    OTP_MIN_LENGTH,
    RESEND_COOLDOWN_SECONDS,
    classifyAuthError,
    cooldownRemainingSeconds,
    isCompleteOtpCode,
    isValidEmail,
    normalizeOtpCode,
} from "./otp";
export type { AuthErrorKind } from "./otp";
