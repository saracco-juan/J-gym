import { exercise, log, trainedLog } from "../__fixtures__/builders";
import { computeStatus } from "../status";

const TODAY = "2026-11-17";

function failed(date: string, id = "bench-press") {
    return log(date, [exercise([[5, 60]], { id, status: "failed" })]);
}

describe("computeStatus", () => {
    it("is inactive with no logs", () => {
        expect(computeStatus([], TODAY, false)).toBe("inactive");
    });

    it("is inactive after seven days without a log", () => {
        expect(computeStatus([trainedLog("2026-11-10")], TODAY, false)).toBe("inactive");
    });

    it("is not inactive when the last log is six days old", () => {
        expect(computeStatus([trainedLog("2026-11-11")], TODAY, false)).toBe("steady");
    });

    it("is steady when nothing stands out", () => {
        expect(computeStatus([trainedLog("2026-11-16")], TODAY, false)).toBe("steady");
    });

    it("is progressing when the month improved on any exercise", () => {
        expect(computeStatus([trainedLog("2026-11-16")], TODAY, true)).toBe("progressing");
    });

    it("is stagnant when an exercise failed its last three sessions", () => {
        const logs = [failed("2026-11-10"), failed("2026-11-12"), failed("2026-11-16")];
        expect(computeStatus(logs, TODAY, false)).toBe("stagnant");
    });

    it("prefers stagnant over progressing", () => {
        const logs = [failed("2026-11-10"), failed("2026-11-12"), failed("2026-11-16")];
        expect(computeStatus(logs, TODAY, true)).toBe("stagnant");
    });

    it("prefers inactive over stagnant and progressing", () => {
        const logs = [failed("2026-11-01"), failed("2026-11-03"), failed("2026-11-05")];
        expect(computeStatus(logs, TODAY, true)).toBe("inactive");
    });

    it("does not count a log without sets as activity", () => {
        const logs = [log("2026-11-16", [exercise([], { status: "skipped" })])];
        expect(computeStatus(logs, TODAY, false)).toBe("inactive");
    });
});
