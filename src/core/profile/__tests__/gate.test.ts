import { decideProfileGate } from "../gate";

describe("decideProfileGate", () => {
    it("sends anonymous users to link an email, profile or not", () => {
        expect(decideProfileGate({ isAnonymous: true, hasProfile: false })).toBe("link-email");
        expect(decideProfileGate({ isAnonymous: true, hasProfile: true })).toBe("link-email");
    });

    it("asks a registered user without a profile to set one up", () => {
        expect(decideProfileGate({ isAnonymous: false, hasProfile: false })).toBe("setup-profile");
    });

    it("lets a registered user with a profile through", () => {
        expect(decideProfileGate({ isAnonymous: false, hasProfile: true })).toBe("ready");
    });
});
