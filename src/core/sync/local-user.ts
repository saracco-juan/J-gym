/**
 * The session user id is read from local storage (works offline). When that
 * yields nothing while the device is offline, the last known user is used so
 * cached data stays reachable; online, no session means signed out.
 */
export function resolveUserId(input: {
    sessionUserId: string | null;
    cachedUserId: string | null;
    online: boolean;
}): string | null {
    if (input.sessionUserId) return input.sessionUserId;
    return input.online ? null : input.cachedUserId;
}

/** On sign-out local data is wiped only when nothing is waiting to sync. */
export function canClearLocalData(pendingCount: number): boolean {
    return pendingCount === 0;
}
