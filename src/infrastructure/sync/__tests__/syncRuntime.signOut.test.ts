const signOut = jest.fn();
const flush = jest.fn();
const outboxCount = jest.fn();
const clearAll = jest.fn();

jest.mock("@/infrastructure/auth/browserClient", () => ({
    createSupabaseBrowserClient: () => ({ auth: { signOut } }),
}));
jest.mock("@/infrastructure/local/localRepositories", () => ({
    getLocalRepositories: () => ({
        outbox: { count: outboxCount },
        sync: { clearAll },
        meta: {},
        profiles: {},
    }),
}));
jest.mock("../SyncEngine", () => ({
    SyncEngine: jest.fn().mockImplementation(() => ({ flush })),
}));
jest.mock("../supabaseTransport", () => ({ createSupabaseTransport: () => ({}) }));
jest.mock("../initialPull", () => ({
    lastPulledKey: (id: string) => id,
    pullOwnProfile: jest.fn(),
    runInitialPull: jest.fn(),
}));

import { signOutAndClear } from "../syncRuntime";

const never = () => new Promise<never>(() => {});

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    flush.mockResolvedValue(undefined);
    signOut.mockResolvedValue({ error: null });
    outboxCount.mockResolvedValue(0);
    clearAll.mockResolvedValue(undefined);
});

afterEach(() => {
    jest.useRealTimers();
});

describe("signOutAndClear", () => {
    it("signs out and wipes local data when the outbox is empty", async () => {
        await expect(signOutAndClear()).resolves.toEqual({ cleared: true });
        expect(signOut).toHaveBeenCalledTimes(1);
        expect(clearAll).toHaveBeenCalledTimes(1);
    });

    it("keeps local data when changes are still unsynced", async () => {
        outboxCount.mockResolvedValue(2);
        await expect(signOutAndClear()).resolves.toEqual({ cleared: false });
        expect(signOut).toHaveBeenCalledTimes(1);
        expect(clearAll).not.toHaveBeenCalled();
    });

    it("falls back to a local sign-out when the server call throws", async () => {
        signOut.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ error: null });
        await expect(signOutAndClear()).resolves.toEqual({ cleared: true });
        expect(signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
    });

    it("falls back to a local sign-out when the server call returns an error", async () => {
        signOut.mockResolvedValueOnce({ error: new Error("network") });
        await signOutAndClear();
        expect(signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
    });

    it("falls back to a local sign-out when the server call never resolves", async () => {
        signOut.mockImplementationOnce(never);
        const result = signOutAndClear();
        await jest.advanceTimersByTimeAsync(10_000);
        await expect(result).resolves.toEqual({ cleared: true });
        expect(signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
    });

    it("does not wait forever for a flush that never settles", async () => {
        flush.mockImplementationOnce(never);
        const result = signOutAndClear();
        await jest.advanceTimersByTimeAsync(10_000);
        await expect(result).resolves.toEqual({ cleared: true });
        expect(signOut).toHaveBeenCalled();
    });

    it("never throws, even when the local sign-out also fails", async () => {
        signOut.mockRejectedValue(new Error("boom"));
        await expect(signOutAndClear()).resolves.toEqual({ cleared: true });
    });

    it("never throws when wiping local data fails", async () => {
        clearAll.mockRejectedValue(new Error("db"));
        await expect(signOutAndClear()).resolves.toEqual({ cleared: false });
    });
});
