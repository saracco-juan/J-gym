import { getUserDisplay } from "./user-display";

describe("getUserDisplay", () => {
    it("labels anonymous users as an account without email", () => {
        expect(getUserDisplay({ isAnonymous: true })).toEqual({
            name: "Cuenta sin email",
            email: "",
            isAnonymous: true,
        });
    });

    it("prefers full name and keeps email for regular users", () => {
        expect(
            getUserDisplay({ email: "a@b.com", fullName: "Ana", isAnonymous: false })
        ).toEqual({ name: "Ana", email: "a@b.com", isAnonymous: false });
    });

    it("falls back to email when there is no full name", () => {
        expect(getUserDisplay({ email: "a@b.com" })).toEqual({
            name: "a@b.com",
            email: "a@b.com",
            isAnonymous: false,
        });
    });
});
