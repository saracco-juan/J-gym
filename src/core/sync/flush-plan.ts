import { nextBatch, type OutboxEntry } from "./outbox";

export type FlushPlan =
    | { kind: "paused"; reason: "signed-out" }
    | { kind: "send"; batch: OutboxEntry[] };

export interface FlushPlanInput {
    entries: readonly OutboxEntry[];
    now: number;
    /** Session user, or null when signed out. */
    userId: string | null;
}

function payloadUserId(entry: OutboxEntry): string | undefined {
    const payload = entry.payload;
    if (typeof payload === "object" && payload !== null && "userId" in payload) {
        const id = (payload as { userId: unknown }).userId;
        return typeof id === "string" ? id : undefined;
    }
    return undefined;
}

/**
 * Decides what a flush may send. Signed out means paused: entries stay
 * untouched (no attempts burned). Upserts that belong to another user (left
 * over from a previous account) are held back; deletes carry no owner and
 * are protected by RLS on the server.
 */
export function planFlush(input: FlushPlanInput): FlushPlan {
    if (input.userId === null) return { kind: "paused", reason: "signed-out" };
    const mine = input.entries.filter((e) => {
        const owner = payloadUserId(e);
        return owner === undefined || owner === input.userId;
    });
    return { kind: "send", batch: nextBatch(mine, input.now) };
}
