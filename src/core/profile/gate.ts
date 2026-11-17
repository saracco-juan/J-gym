/**
 * Which screen a signed-in user needs before the app is fully usable:
 * - link-email:    anonymous accounts cannot have a profile, they link an email first.
 * - setup-profile: registered, but no display name yet.
 * - ready:         nothing to ask for.
 */

export type ProfileGate = "link-email" | "setup-profile" | "ready";

export function decideProfileGate(input: { isAnonymous: boolean; hasProfile: boolean }): ProfileGate {
    if (input.isAnonymous) return "link-email";
    return input.hasProfile ? "ready" : "setup-profile";
}
