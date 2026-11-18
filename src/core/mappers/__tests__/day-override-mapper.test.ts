import {
    DAY_OVERRIDE_SCHEMA_VERSION,
    dayOverrideFromRow,
    dayOverrideToRow,
} from "../day-override-mapper";

describe("day override mapper", () => {
    const override = { userId: "u1", date: "2026-11-20", dayName: "martes" };

    it("round-trips an override", () => {
        expect(dayOverrideFromRow(dayOverrideToRow(override))).toEqual(override);
    });

    it("writes the snake_case row with its schema version", () => {
        expect(dayOverrideToRow(override)).toEqual({
            user_id: "u1",
            date: "2026-11-20",
            day_name: "martes",
            schema_version: DAY_OVERRIDE_SCHEMA_VERSION,
        });
        expect(DAY_OVERRIDE_SCHEMA_VERSION).toBe(1);
    });

    it("keeps only the calendar day of a timestamp-like date", () => {
        expect(dayOverrideFromRow({ ...dayOverrideToRow(override), date: "2026-11-20T00:00:00" }).date).toBe(
            "2026-11-20"
        );
    });

    it("tolerates garbage rows without throwing", () => {
        expect(dayOverrideFromRow(null)).toEqual({ userId: "", date: "", dayName: "" });
        expect(dayOverrideFromRow({ user_id: 3, date: [], day_name: {} })).toEqual({
            userId: "3",
            date: "",
            dayName: "",
        });
    });
});
