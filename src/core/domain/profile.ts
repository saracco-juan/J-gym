/** Public identity of a user: what the leaderboard shows next to the stats. */
export interface IProfile {
    userId: string;
    displayName: string;
    /** One of the fixed avatar palette colors (see core/profile). */
    avatarColor: string;
}
