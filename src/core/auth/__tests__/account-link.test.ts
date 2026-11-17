import { shouldOfferEmailLink } from "../account-link";

describe("shouldOfferEmailLink", () => {
    it("offers linking to a signed-in anonymous user", () => {
        expect(shouldOfferEmailLink({ isAnonymous: true })).toBe(true);
    });

    it("does not offer it to a user that already has an email", () => {
        expect(shouldOfferEmailLink({ isAnonymous: false })).toBe(false);
        expect(shouldOfferEmailLink({})).toBe(false);
    });

    it("does not offer it while signed out or still resolving", () => {
        expect(shouldOfferEmailLink(null)).toBe(false);
        expect(shouldOfferEmailLink(undefined)).toBe(false);
    });
});
