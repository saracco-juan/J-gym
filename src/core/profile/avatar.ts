/**
 * Avatar palette and initials. The palette is fixed (and mirrored by the
 * CHECK constraint of `profiles.avatar_color`, see migration 0004): mid tones
 * that keep white initials readable on the dark surfaces.
 */

export const AVATAR_COLORS = [
    "#059669", // emerald: the app accent
    "#0d9488", // teal
    "#0284c7", // sky
    "#2563eb", // blue
    "#7c3aed", // violet
    "#c026d3", // fuchsia
    "#db2777", // pink
    "#ea580c", // orange
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const DEFAULT_AVATAR_COLOR: AvatarColor = AVATAR_COLORS[0];

/** True for a palette color (case-insensitive). */
export function isAvatarColor(value: unknown): value is AvatarColor {
    return (
        typeof value === "string" && (AVATAR_COLORS as readonly string[]).includes(value.toLowerCase())
    );
}

const SEPARATORS = /[\s._-]+/;

/**
 * Up to two uppercase letters: the first letter of the first two words, or the
 * first two letters of a single word. "?" when there is nothing to show.
 */
export function getInitials(name: string): string {
    const words = name.split(SEPARATORS).filter((w) => w !== "");
    if (words.length === 0) return "?";
    const letters =
        words.length === 1 ? Array.from(words[0]).slice(0, 2) : words.slice(0, 2).map((w) => Array.from(w)[0]);
    return letters.join("").toUpperCase();
}
