import { exercise, legacyExercise, log } from "../__fixtures__/builders";
import { TRACKED_LIFTS, computeBestLifts } from "../best-lifts";

describe("computeBestLifts", () => {
    it("tracks squat, bench press and lat pulldown", () => {
        expect(TRACKED_LIFTS).toEqual(["back-squat", "bench-press", "lat-pulldown"]);
    });

    it("is null for every lift when nothing was logged", () => {
        expect(computeBestLifts([])).toEqual({
            "back-squat": null,
            "bench-press": null,
            "lat-pulldown": null,
        });
    });

    it("takes the heaviest set ever with the reps of that set", () => {
        const logs = [
            log("2026-11-02", [exercise([[8, 60]], { id: "bench-press" })]),
            log("2026-11-09", [exercise([[6, 70], [8, 65]], { id: "bench-press" })]),
            log("2026-11-16", [exercise([[10, 62]], { id: "bench-press" })]),
        ];
        expect(computeBestLifts(logs)["bench-press"]).toEqual({ weight: 70, reps: 6 });
    });

    it("keeps each lift apart and leaves the unlogged ones null", () => {
        const logs = [
            log("2026-11-02", [
                exercise([[5, 100]], { id: "back-squat", name: "Sentadilla con barra" }),
                exercise([[10, 40]], { id: "lat-pulldown", name: "Jalón al pecho" }),
            ]),
        ];
        expect(computeBestLifts(logs)).toEqual({
            "back-squat": { weight: 100, reps: 5 },
            "bench-press": null,
            "lat-pulldown": { weight: 40, reps: 10 },
        });
    });

    it("ignores other exercises", () => {
        const logs = [log("2026-11-02", [exercise([[8, 200]], { id: "leg-press", name: "Prensa" })])];
        expect(computeBestLifts(logs)["back-squat"]).toBeNull();
    });

    it("matches legacy entries without a ref by catalog name or alias", () => {
        const logs = [
            log("2026-10-01", [legacyExercise("Sentadilla", [[5, 90]])]),
            log("2026-10-08", [legacyExercise("Dorsalera", [[12, 45]])]),
        ];
        const lifts = computeBestLifts(logs);
        expect(lifts["back-squat"]).toEqual({ weight: 90, reps: 5 });
        expect(lifts["lat-pulldown"]).toEqual({ weight: 45, reps: 12 });
    });

    it("merges a legacy entry and a ref entry of the same lift", () => {
        const logs = [
            log("2026-10-01", [legacyExercise("Press banca", [[5, 80]])]),
            log("2026-11-01", [exercise([[5, 75]], { id: "bench-press" })]),
        ];
        expect(computeBestLifts(logs)["bench-press"]).toEqual({ weight: 80, reps: 5 });
    });

    it("stays null when the lift was only logged without weight", () => {
        const logs = [log("2026-11-02", [exercise([[10, 0]], { id: "bench-press" })])];
        expect(computeBestLifts(logs)["bench-press"]).toBeNull();
    });

    it("gives the tie to the earliest session, like personal records", () => {
        const logs = [
            log("2026-11-09", [exercise([[8, 70]], { id: "bench-press" })]),
            log("2026-11-02", [exercise([[5, 70]], { id: "bench-press" })]),
        ];
        expect(computeBestLifts(logs)["bench-press"]).toEqual({ weight: 70, reps: 5 });
    });
});
