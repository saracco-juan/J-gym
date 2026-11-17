import {
    DISPLAY_NAME_MAX_LENGTH,
    DISPLAY_NAME_MIN_LENGTH,
    validateDisplayName,
} from "../display-name";

describe("validateDisplayName", () => {
    it("accepts a normal name and returns it trimmed", () => {
        expect(validateDisplayName("  Juan Saracco ")).toEqual({ ok: true, value: "Juan Saracco" });
    });

    it("collapses repeated inner spaces", () => {
        expect(validateDisplayName("Juan    Saracco")).toEqual({ ok: true, value: "Juan Saracco" });
    });

    it("accepts letters with accents, numbers and . _ -", () => {
        expect(validateDisplayName("Álvaro_99")).toEqual({ ok: true, value: "Álvaro_99" });
        expect(validateDisplayName("lu.ca-2")).toEqual({ ok: true, value: "lu.ca-2" });
    });

    it("rejects an empty or spaces-only name", () => {
        expect(validateDisplayName("")).toEqual({ ok: false, reason: "empty" });
        expect(validateDisplayName("     ")).toEqual({ ok: false, reason: "empty" });
    });

    it("enforces the length bounds after trimming", () => {
        expect(DISPLAY_NAME_MIN_LENGTH).toBe(2);
        expect(DISPLAY_NAME_MAX_LENGTH).toBe(24);
        expect(validateDisplayName(" a ")).toEqual({ ok: false, reason: "too-short" });
        expect(validateDisplayName("ab")).toEqual({ ok: true, value: "ab" });
        expect(validateDisplayName("a".repeat(24))).toEqual({ ok: true, value: "a".repeat(24) });
        expect(validateDisplayName("a".repeat(25))).toEqual({ ok: false, reason: "too-long" });
    });

    it("rejects characters outside the allowed set", () => {
        expect(validateDisplayName("juan!")).toEqual({ ok: false, reason: "invalid-chars" });
        expect(validateDisplayName("a@b")).toEqual({ ok: false, reason: "invalid-chars" });
        expect(validateDisplayName("💪 gym")).toEqual({ ok: false, reason: "invalid-chars" });
    });

    it("rejects a name made only of separators", () => {
        expect(validateDisplayName("._-")).toEqual({ ok: false, reason: "invalid-chars" });
    });
});
