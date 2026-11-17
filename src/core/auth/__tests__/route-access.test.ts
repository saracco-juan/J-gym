import { classifyRoute, decideRedirect } from "../route-access";

describe("classifyRoute", () => {
    it.each([
        ["/dashboard", "protected"],
        ["/dashboard/anything", "protected"],
        ["/workout", "protected"],
        ["/workout/abc", "protected"],
        ["/onboarding", "protected"],
        ["/login", "auth"],
        ["/login/reset", "auth"],
        ["/", "root"],
        ["/~offline", "public"],
        ["/auth/callback", "public"],
        ["/dashboards", "public"],
    ])("%s is %s", (pathname, expected) => {
        expect(classifyRoute(pathname)).toBe(expected);
    });
});

describe("decideRedirect", () => {
    it("sends signed-out users from protected routes to /login", () => {
        expect(decideRedirect("/workout", false)).toBe("/login");
        expect(decideRedirect("/dashboard", false)).toBe("/login");
        expect(decideRedirect("/onboarding", false)).toBe("/login");
    });

    it("sends the root to /login when signed out", () => {
        expect(decideRedirect("/", false)).toBe("/login");
    });

    it("sends signed-in users from root and login to /dashboard", () => {
        expect(decideRedirect("/", true)).toBe("/dashboard");
        expect(decideRedirect("/login", true)).toBe("/dashboard");
    });

    it("lets signed-in users reach protected routes", () => {
        expect(decideRedirect("/workout", true)).toBeNull();
    });

    it("lets signed-out users reach the login page and public routes", () => {
        expect(decideRedirect("/login", false)).toBeNull();
        expect(decideRedirect("/~offline", false)).toBeNull();
        expect(decideRedirect("/auth/callback", false)).toBeNull();
    });
});
