/**
 * XP and level curve. Every logged set is worth XP_PER_SET. Reaching level L
 * takes 100 * L * (L - 1) / 2 total XP: level 1 starts at 0, level 2 at 100,
 * level 3 at 300, level 4 at 600. Each level is 100 XP longer than the last.
 */

export const XP_PER_SET = 10;

export interface LevelProgress {
    level: number;
    /** Total XP. */
    xp: number;
    /** XP earned since this level started. */
    xpIntoLevel: number;
    /** Size of the current level: XP between its start and the next level. */
    xpForNextLevel: number;
}

/** Total XP at which `level` starts. */
export function xpForLevel(level: number): number {
    return (100 * level * (level - 1)) / 2;
}

export function levelFromXp(xp: number): number {
    const safe = Math.max(0, Math.floor(xp));
    // Closed form of the curve, then corrected for floating point error.
    let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * safe) / 50)) / 2));
    while (xpForLevel(level) > safe) level--;
    while (xpForLevel(level + 1) <= safe) level++;
    return level;
}

export function levelProgress(xp: number): LevelProgress {
    const safe = Math.max(0, Math.floor(xp));
    const level = levelFromXp(safe);
    return {
        level,
        xp: safe,
        xpIntoLevel: safe - xpForLevel(level),
        xpForNextLevel: xpForLevel(level + 1) - xpForLevel(level),
    };
}
