import {
    DELETE_CONFIRMATION_PHRASE,
    deleteAccountBlock,
    isDeleteConfirmed,
} from "../delete-account";

describe("isDeleteConfirmed", () => {
    it("accepts the exact phrase", () => {
        expect(isDeleteConfirmed(DELETE_CONFIRMATION_PHRASE)).toBe(true);
        expect(DELETE_CONFIRMATION_PHRASE).toBe("ELIMINAR");
    });

    it("ignores surrounding whitespace and letter case (mobile keyboards)", () => {
        expect(isDeleteConfirmed("  eliminar \n")).toBe(true);
        expect(isDeleteConfirmed("Eliminar")).toBe(true);
    });

    it("rejects anything else", () => {
        expect(isDeleteConfirmed("")).toBe(false);
        expect(isDeleteConfirmed("ELIMINA")).toBe(false);
        expect(isDeleteConfirmed("ELIMINAR cuenta")).toBe(false);
        expect(isDeleteConfirmed("ELIM INAR")).toBe(false);
    });
});

describe("deleteAccountBlock", () => {
    it("blocks while offline, even with the phrase typed", () => {
        expect(deleteAccountBlock({ online: false, typed: "ELIMINAR" })).toBe("offline");
    });

    it("blocks while the phrase is not confirmed", () => {
        expect(deleteAccountBlock({ online: true, typed: "" })).toBe("unconfirmed");
        expect(deleteAccountBlock({ online: true, typed: "borrar" })).toBe("unconfirmed");
    });

    it("allows an online user who typed the phrase", () => {
        expect(deleteAccountBlock({ online: true, typed: "eliminar" })).toBeNull();
    });
});
