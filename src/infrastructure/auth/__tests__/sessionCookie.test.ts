import { hasLocalSession, type CookieLike } from "../sessionCookie";

const encode = (value: unknown) =>
    "base64-" + Buffer.from(JSON.stringify(value)).toString("base64url");

const session = { access_token: "a.b.c", refresh_token: "r", expires_at: 1 };

describe("hasLocalSession", () => {
    it("is false without cookies", () => {
        expect(hasLocalSession([])).toBe(false);
    });

    it("ignores unrelated cookies", () => {
        expect(hasLocalSession([{ name: "theme", value: "dark" }])).toBe(false);
    });

    it("accepts a base64 encoded session cookie", () => {
        const cookies: CookieLike[] = [{ name: "sb-abc-auth-token", value: encode(session) }];
        expect(hasLocalSession(cookies)).toBe(true);
    });

    it("accepts a raw JSON session cookie", () => {
        const cookies = [{ name: "sb-abc-auth-token", value: JSON.stringify(session) }];
        expect(hasLocalSession(cookies)).toBe(true);
    });

    it("reassembles chunked cookies in order", () => {
        const full = encode(session);
        const mid = Math.floor(full.length / 2);
        const cookies = [
            { name: "sb-abc-auth-token.1", value: full.slice(mid) },
            { name: "sb-abc-auth-token.0", value: full.slice(0, mid) },
        ];
        expect(hasLocalSession(cookies)).toBe(true);
    });

    it("stays signed in with an expired access token while a refresh token exists", () => {
        const expired = { ...session, expires_at: 1 };
        expect(hasLocalSession([{ name: "sb-abc-auth-token", value: encode(expired) }])).toBe(true);
    });

    it("rejects garbage and sessions without tokens", () => {
        expect(hasLocalSession([{ name: "sb-abc-auth-token", value: "base64-@@@" }])).toBe(false);
        expect(hasLocalSession([{ name: "sb-abc-auth-token", value: "nope" }])).toBe(false);
        expect(
            hasLocalSession([{ name: "sb-abc-auth-token", value: encode({ access_token: "x" }) }]),
        ).toBe(false);
    });
});
