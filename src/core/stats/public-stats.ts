/**
 * What other users can read about someone: the published part of `UserStats`.
 * The XP progress inside the level is not published; readers derive it from
 * `xp` with `levelProgress`.
 */

import type { UserStats } from "./user-stats";

export interface PublicStats extends Omit<UserStats, "xpIntoLevel" | "xpForNextLevel"> {
    userId: string;
    /** Server time of the last publish (ISO), null when unknown. */
    updatedAt: string | null;
}
