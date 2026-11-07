import { getUserDisplay } from "./user-display";

describe("getUserDisplay", () => {
    it("labels anonymous users as demo users with no email", () => {
        expect(getUserDisplay({ isAnonymous: true })).toEqual({
            name: "Usuario demo",
            email: "",
            isDemo: true,
        });
    });

    it("prefers full name and keeps email for regular users", () => {
        expect(
            getUserDisplay({ email: "a@b.com", fullName: "Ana", isAnonymous: false })
        ).toEqual({ name: "Ana", email: "a@b.com", isDemo: false });
    });

    it("falls back to email when there is no full name", () => {
        expect(getUserDisplay({ email: "a@b.com" })).toEqual({
            name: "a@b.com",
            email: "a@b.com",
            isDemo: false,
        });
    });
});
