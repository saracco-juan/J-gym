import { XP_PER_SET, levelFromXp, levelProgress, xpForLevel } from "../level";

describe("xpForLevel", () => {
    it("follows 100 * L * (L - 1) / 2 total XP", () => {
        expect(xpForLevel(1)).toBe(0);
        expect(xpForLevel(2)).toBe(100);
        expect(xpForLevel(3)).toBe(300);
        expect(xpForLevel(4)).toBe(600);
        expect(xpForLevel(10)).toBe(4500);
    });
});

describe("levelFromXp", () => {
    it("starts at level 1 with no XP", () => {
        expect(levelFromXp(0)).toBe(1);
        expect(levelFromXp(99)).toBe(1);
    });

    it("moves up exactly on the threshold", () => {
        expect(levelFromXp(100)).toBe(2);
        expect(levelFromXp(299)).toBe(2);
        expect(levelFromXp(300)).toBe(3);
        expect(levelFromXp(599)).toBe(3);
        expect(levelFromXp(600)).toBe(4);
    });

    it("stays exact for large values", () => {
        expect(levelFromXp(xpForLevel(500) - 1)).toBe(499);
        expect(levelFromXp(xpForLevel(500))).toBe(500);
    });

    it("treats negative or fractional XP as the floor of the curve", () => {
        expect(levelFromXp(-50)).toBe(1);
        expect(levelFromXp(100.9)).toBe(2);
    });
});

describe("levelProgress", () => {
    it("reports XP into the level and the size of the level", () => {
        expect(levelProgress(0)).toEqual({
            level: 1,
            xp: 0,
            xpIntoLevel: 0,
            xpForNextLevel: 100,
        });
        expect(levelProgress(150)).toEqual({
            level: 2,
            xp: 150,
            xpIntoLevel: 50,
            xpForNextLevel: 200,
        });
        expect(levelProgress(300)).toEqual({
            level: 3,
            xp: 300,
            xpIntoLevel: 0,
            xpForNextLevel: 300,
        });
    });
});

describe("XP_PER_SET", () => {
    it("is 10", () => {
        expect(XP_PER_SET).toBe(10);
    });
});
