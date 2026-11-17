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
export { shouldOfferEmailLink } from "./account-link";
export type { AccountLinkUser } from "./account-link";
export { signOutWarning } from "./sign-out-warning";
export type { SignOutWarning, SignOutWarningInput } from "./sign-out-warning";
