import { signOutWarning } from "../sign-out-warning";

describe("signOutWarning", () => {
    it("warns an anonymous user that the account cannot be recovered", () => {
        expect(signOutWarning({ isAnonymous: true, pendingCount: 0 })).toBe("anonymous");
    });

    it("gives the anonymous warning precedence over unsynced changes", () => {
        expect(signOutWarning({ isAnonymous: true, pendingCount: 3 })).toBe("anonymous");
    });

    it("warns about unsynced changes for a regular account", () => {
        expect(signOutWarning({ isAnonymous: false, pendingCount: 2 })).toBe("unsynced");
    });

    it("does not warn when everything is synced", () => {
        expect(signOutWarning({ isAnonymous: false, pendingCount: 0 })).toBeNull();
    });
});
