"use client";

/**
 * ExerciseEditorCard — one exercise of a routine day: move up or down, remove,
 * and edit sets, reps and target weight (the same value for every set).
 * Presentational: invalid fields show their specific message inline.
 */

import { ArrowDown, ArrowUp, Trash } from "@phosphor-icons/react";
import type { DraftExercise, DraftIssue } from "@/core/routine";
import { weightFieldLabel } from "@/core/session";

interface ExerciseEditorCardProps {
    exercise: DraftExercise;
    isFirst: boolean;
    isLast: boolean;
    /** Issues of this exercise only. */
    issues: readonly DraftIssue[];
    onChange: (patch: Partial<Pick<DraftExercise, "sets" | "reps" | "weight">>) => void;
    onMove: (direction: "up" | "down") => void;
    onRemove: () => void;
}

const FIELDS = [
    { key: "sets", label: "Series", inputMode: "numeric" },
    { key: "reps", label: "Reps", inputMode: "numeric" },
    { key: "weight", label: "Peso (kg)", inputMode: "decimal" },
] as const;

export default function ExerciseEditorCard({
    exercise,
    isFirst,
    isLast,
    issues,
    onChange,
    onMove,
    onRemove,
}: ExerciseEditorCardProps) {
    const issueOf = (field: string) => issues.find((i) => i.field === field);

    return (
        <section
            className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-raised p-3"
            aria-label={exercise.name}
        >
            <div className="flex items-center justify-between gap-2">
                <h3 className="title-3 min-w-0 text-text-primary">{exercise.name}</h3>
                <div className="-my-2 -mr-2 flex shrink-0">
                    <button
                        type="button"
                        onClick={() => onMove("up")}
                        disabled={isFirst}
                        className="btn-icon"
                        aria-label={`Subir ${exercise.name}`}
                    >
                        <ArrowUp size={24} weight="bold" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onMove("down")}
                        disabled={isLast}
                        className="btn-icon"
                        aria-label={`Bajar ${exercise.name}`}
                    >
                        <ArrowDown size={24} weight="bold" />
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="btn-icon text-danger-text hover:enabled:text-danger-text"
                        aria-label={`Quitar ${exercise.name}`}
                    >
                        <Trash size={24} weight="bold" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {FIELDS.map(({ key, label, inputMode }) => {
                    const id = `${exercise.id}-${key}`;
                    const issue = issueOf(key);
                    return (
                        <div key={key} className="flex flex-col gap-1">
                            <label htmlFor={id} className="caption-4 text-text-secondary">
                                {key === "weight" ? weightFieldLabel(exercise.isBodyweight) : label}
                            </label>
                            <input
                                id={id}
                                type="text"
                                inputMode={inputMode}
                                autoComplete="off"
                                placeholder={key === "weight" ? "0" : "—"}
                                value={exercise[key]}
                                onChange={(e) => onChange({ [key]: e.target.value })}
                                aria-invalid={issue ? true : undefined}
                                aria-describedby={issue ? `${id}-error` : undefined}
                                className="field no-spin text-center aria-invalid:border-danger-border"
                            />
                        </div>
                    );
                })}
            </div>

            {issues.length > 0 && (
                <ul className="flex flex-col gap-1">
                    {issues.map((issue) => (
                        <li
                            key={issue.field}
                            id={`${exercise.id}-${issue.field}-error`}
                            role="alert"
                            className="caption-5 text-danger-text"
                        >
                            {issue.message}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
