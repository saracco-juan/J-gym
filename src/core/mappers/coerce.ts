/**
 * Tolerant coercion helpers shared by the row mappers.
 * Stored JSON may be legacy, partial or garbage: none of these ever throw.
 */

import { getCatalogExercise, resolveLegacyExerciseName } from "../catalog";
import type { ExerciseRef } from "../catalog";
import type { IExercise } from "../domain";

export function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

export function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return "";
}

export function asNullableString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

/** Numbers and numeric strings ("42.5") are accepted; anything else is 0. */
export function asNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

export function parseRef(value: unknown): ExerciseRef | undefined {
    const rec = asRecord(value);
    if (
        (rec.source === "catalog" || rec.source === "custom") &&
        typeof rec.id === "string" &&
        rec.id !== ""
    ) {
        return { source: rec.source, id: rec.id };
    }
    return undefined;
}

/**
 * Ref resolution order: explicit valid `ref`, then the catalog legacy-name
 * resolver, then `exercise_id` when it is itself a catalog id. Otherwise
 * undefined (free-text legacy exercise).
 */
export function resolveRef(rec: Record<string, unknown>, exercise: IExercise): ExerciseRef | undefined {
    const explicit = parseRef(rec.ref);
    if (explicit) return explicit;
    const byName = resolveLegacyExerciseName(exercise.name);
    if (byName) return { source: "catalog", id: byName };
    if (getCatalogExercise(exercise.id)) return { source: "catalog", id: exercise.id };
    return undefined;
}

export function parseExercise(rec: Record<string, unknown>): IExercise {
    return { id: asString(rec.exercise_id), name: asString(rec.exercise_name) };
}
