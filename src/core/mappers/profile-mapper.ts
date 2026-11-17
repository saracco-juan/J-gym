import type { IProfile } from "../domain";
import { DEFAULT_AVATAR_COLOR, isAvatarColor } from "../profile";
import { asRecord, asString } from "./coerce";

export interface ProfileRow {
    user_id: string;
    display_name: string;
    avatar_color: string;
}

/** Never throws. An unknown color falls back to the default one. */
export function profileFromRow(row: unknown): IProfile {
    const rec = asRecord(row);
    const color = asString(rec.avatar_color).toLowerCase();
    return {
        userId: asString(rec.user_id),
        displayName: asString(rec.display_name),
        avatarColor: isAvatarColor(color) ? color : DEFAULT_AVATAR_COLOR,
    };
}

/** `updated_at` is maintained by the server trigger, so it is not sent. */
export function profileToRow(profile: IProfile): ProfileRow {
    return {
        user_id: profile.userId,
        display_name: profile.displayName,
        avatar_color: profile.avatarColor,
    };
}
