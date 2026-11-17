/**
 * Avatar: initials on the user's chosen palette color. Presentational and
 * decorative (the name is always shown or labelled next to it).
 */

import { getInitials } from "@/core/profile";

interface AvatarProps {
    name: string;
    /** A palette color (see AVATAR_COLORS). */
    color: string;
    /** "fill" takes the size of its container (the header button). */
    size?: "md" | "xl" | "fill";
}

const SIZES = {
    md: "size-12 body-4",
    xl: "size-24 heading-5",
    fill: "size-full body-4",
} as const;

export default function Avatar({ name, color, size = "md" }: AvatarProps) {
    return (
        <span
            aria-hidden="true"
            style={{ backgroundColor: color }}
            className={`flex shrink-0 items-center justify-center rounded-full text-text-primary ${SIZES[size]}`}
        >
            {getInitials(name)}
        </span>
    );
}
