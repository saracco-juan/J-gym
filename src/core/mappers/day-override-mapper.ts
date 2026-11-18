import { asRecord, asString } from "./coerce";

/** Bump when the shape of a `day_overrides` row changes. */
export const DAY_OVERRIDE_SCHEMA_VERSION = 1;

/** One swapped day of a user: `date` (YYYY-MM-DD) shows the routine of `dayName`. */
export interface DayOverrideWithUser {
    userId: string;
    date: string;
    dayName: string;
}

export interface DayOverrideRow {
    user_id: string;
    date: string;
    day_name: string;
    schema_version: number;
}

/** Never throws. A date with a time part keeps only its calendar day. */
export function dayOverrideFromRow(row: unknown): DayOverrideWithUser {
    const rec = asRecord(row);
    return {
        userId: asString(rec.user_id),
        date: asString(rec.date).slice(0, 10),
        dayName: asString(rec.day_name),
    };
}

export function dayOverrideToRow(override: DayOverrideWithUser): DayOverrideRow {
    return {
        user_id: override.userId,
        date: override.date,
        day_name: override.dayName,
        schema_version: DAY_OVERRIDE_SCHEMA_VERSION,
    };
}
