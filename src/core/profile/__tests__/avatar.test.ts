import { AVATAR_COLORS, DEFAULT_AVATAR_COLOR, getInitials, isAvatarColor } from "../avatar";

describe("AVATAR_COLORS", () => {
    it("is a fixed palette of 8 distinct lowercase hex colors", () => {
        expect(AVATAR_COLORS).toHaveLength(8);
        expect(new Set(AVATAR_COLORS).size).toBe(8);
        for (const color of AVATAR_COLORS) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("starts with the accent emerald, which is the default", () => {
        expect(AVATAR_COLORS[0]).toBe("#059669");
        expect(DEFAULT_AVATAR_COLOR).toBe(AVATAR_COLORS[0]);
    });
});

describe("isAvatarColor", () => {
    it("accepts palette colors, ignoring case", () => {
        expect(isAvatarColor("#059669")).toBe(true);
        expect(isAvatarColor("#059669".toUpperCase())).toBe(true);
    });

    it("rejects anything else", () => {
        expect(isAvatarColor("#123456")).toBe(false);
        expect(isAvatarColor("red")).toBe(false);
        expect(isAvatarColor("")).toBe(false);
        expect(isAvatarColor(null)).toBe(false);
        expect(isAvatarColor(42)).toBe(false);
    });
});

describe("getInitials", () => {
    it("uses the first letter of the first two words", () => {
        expect(getInitials("Juan Saracco")).toBe("JS");
        expect(getInitials("ana maria perez")).toBe("AM");
    });

    it("uses the first two letters of a single word", () => {
        expect(getInitials("juan")).toBe("JU");
        expect(getInitials("a")).toBe("A");
    });

    it("treats dots, underscores and dashes as word separators", () => {
        expect(getInitials("juan.saracco")).toBe("JS");
        expect(getInitials("mati_g")).toBe("MG");
        expect(getInitials("lu-ca")).toBe("LC");
    });

    it("keeps accented letters and ignores extra spaces", () => {
        expect(getInitials("  álvaro   núñez ")).toBe("ÁN");
    });

    it("falls back to a placeholder when there is nothing to show", () => {
        expect(getInitials("")).toBe("?");
        expect(getInitials("   ")).toBe("?");
        expect(getInitials("._-")).toBe("?");
    });
});
