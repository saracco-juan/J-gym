import { performAccountDeletion, type DeleteAccountDeps } from "../deleteAccount";

function makeDeps(overrides: Partial<DeleteAccountDeps> = {}) {
    const calls: string[] = [];
    const deps: DeleteAccountDeps = {
        callDeleteRpc: jest.fn(async () => {
            calls.push("rpc");
            return { error: null };
        }),
        clearLocalData: jest.fn(async () => {
            calls.push("clear");
        }),
        removeLocalSession: jest.fn(async () => {
            calls.push("signOut");
        }),
        onDeleted: jest.fn(() => {
            calls.push("deleted");
        }),
        ...overrides,
    };
    return { deps, calls };
}

describe("performAccountDeletion", () => {
    it("deletes on the server first, then wipes the device and the session", async () => {
        const { deps, calls } = makeDeps();
        await expect(performAccountDeletion(deps)).resolves.toEqual({ ok: true });
        expect(calls).toEqual(["rpc", "clear", "signOut", "deleted"]);
    });

    it("keeps everything local when the server refuses", async () => {
        const { deps } = makeDeps({
            callDeleteRpc: jest.fn(async () => ({ error: { message: "boom", code: "XX000" } })),
        });
        await expect(performAccountDeletion(deps)).resolves.toEqual({ ok: false, reason: "failed" });
        expect(deps.clearLocalData).not.toHaveBeenCalled();
        expect(deps.removeLocalSession).not.toHaveBeenCalled();
    });

    it("reports a network failure returned by the client", async () => {
        const { deps } = makeDeps({
            callDeleteRpc: jest.fn(async () => ({ error: { message: "TypeError: Failed to fetch" } })),
        });
        await expect(performAccountDeletion(deps)).resolves.toEqual({ ok: false, reason: "network" });
    });

    it("reports a network failure thrown by the client", async () => {
        const { deps } = makeDeps({
            callDeleteRpc: jest.fn(async () => {
                throw new TypeError("Failed to fetch");
            }),
        });
        await expect(performAccountDeletion(deps)).resolves.toEqual({ ok: false, reason: "network" });
        expect(deps.clearLocalData).not.toHaveBeenCalled();
    });

    it("reports an expired session", async () => {
        const { deps } = makeDeps({
            callDeleteRpc: jest.fn(async () => ({ error: { status: 401, message: "JWT expired" } })),
        });
        await expect(performAccountDeletion(deps)).resolves.toEqual({ ok: false, reason: "auth" });
    });

    it("still drops the session when wiping local data fails", async () => {
        const { deps } = makeDeps({
            clearLocalData: jest.fn(async () => {
                throw new Error("db");
            }),
        });
        await expect(performAccountDeletion(deps)).resolves.toEqual({ ok: true });
        expect(deps.removeLocalSession).toHaveBeenCalled();
    });

    it("succeeds even when the local sign-out fails", async () => {
        const { deps } = makeDeps({
            removeLocalSession: jest.fn(async () => {
                throw new Error("timeout");
            }),
        });
        await expect(performAccountDeletion(deps)).resolves.toEqual({ ok: true });
        expect(deps.onDeleted).toHaveBeenCalled();
    });
});
