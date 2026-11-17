import { profileFromRow, profileToRow } from "../profile-mapper";

describe("profileFromRow", () => {
    it("maps a server row to the domain shape", () => {
        expect(
            profileFromRow({ user_id: "u1", display_name: "Juan", avatar_color: "#2563eb" }),
        ).toEqual({ userId: "u1", displayName: "Juan", avatarColor: "#2563eb" });
    });

    it("falls back to the default color for an unknown one", () => {
        expect(
            profileFromRow({ user_id: "u1", display_name: "Juan", avatar_color: "#abcdef" }).avatarColor,
        ).toBe("#059669");
    });

    it("never throws on garbage", () => {
        expect(profileFromRow(null)).toEqual({ userId: "", displayName: "", avatarColor: "#059669" });
        expect(profileFromRow("x")).toEqual({ userId: "", displayName: "", avatarColor: "#059669" });
    });
});

describe("profileToRow", () => {
    it("maps the domain shape to a row", () => {
        expect(profileToRow({ userId: "u1", displayName: "Juan", avatarColor: "#2563eb" })).toEqual({
            user_id: "u1",
            display_name: "Juan",
            avatar_color: "#2563eb",
        });
    });
});
