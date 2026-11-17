"use client";

/**
 * The own profile as stored on the device, plus the reason the server refused
 * the last write (if it did). `profile` is `undefined` until the first read
 * finished, `null` when the user has none. Written by SyncProvider after
 * sign-in, after every sync and by the profile screen after saving.
 */

import { create } from "zustand";
import type { IProfile } from "@/core/domain";
import type { ProfileRejection } from "@/infrastructure/local/db";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";

interface ProfileStoreState {
    profile: IProfile | null | undefined;
    rejection: ProfileRejection | null;
}

export const useProfileStore = create<ProfileStoreState>()(() => ({
    profile: undefined,
    rejection: null,
}));

/** Reads the profile of `userId` from the local database into the store. */
export async function refreshProfile(userId: string | null): Promise<void> {
    if (!userId) {
        useProfileStore.setState({ profile: null, rejection: null });
        return;
    }
    const repos = getLocalRepositories();
    const [profile, rejection] = await Promise.all([
        repos.profiles.get(userId),
        repos.profiles.getRejection(userId),
    ]);
    useProfileStore.setState({ profile: profile ?? null, rejection: rejection ?? null });
}

/** True when the server refused the name the profile currently has. */
export function isNameRejected(state: ProfileStoreState): boolean {
    return (
        state.rejection !== null &&
        state.profile != null &&
        state.rejection.displayName === state.profile.displayName
    );
}
