"use client";

/**
 * RoutineSummary — Renderiza la lista de ejercicios para un día.
 *
 * Acepta dos modos via discriminated union:
 * - "template": Muestra el plan (series/reps objetivo)
 * - "log": Muestra lo realizado (series/reps/peso logrados) — Solo lectura
 */

import Link from "next/link";
import { ChartLineUp } from "@phosphor-icons/react";
import type { ExerciseRef } from "@/core/catalog";
import type { IExercise } from "@/core/domain/exercises";
import type { IRoutineTemplate } from "@/core/domain/routine-template";
import type { IWorkoutLog } from "@/core/domain/workout-log";
import { exerciseHistoryKey, isExerciseStagnant } from "@/core/progress";
import { historyHref } from "@/presentation/components/history/historyHref";
import StagnationNotice from "@/presentation/components/ui/StagnationNotice";

type RoutineSummaryProps = (
    | { mode: "template"; template: IRoutineTemplate }
    | { mode: "log"; log: IWorkoutLog }
) & {
    /** Keys of the exercises that failed their last three sessions. */
    stagnant?: ReadonlySet<string>;
};

const NO_STAGNANT: ReadonlySet<string> = new Set();

export default function RoutineSummary(props: RoutineSummaryProps) {
    const stagnant = props.stagnant ?? NO_STAGNANT;
    if (props.mode === "template") {
        return <TemplateSummary template={props.template} stagnant={stagnant} />;
    }
    return <LogSummary log={props.log} stagnant={stagnant} />;
}

/** Exercise name that opens the exercise history. */
function ExerciseNameLink({ item }: { item: { exercise: IExercise; ref?: ExerciseRef } }) {
    return (
        <Link
            href={historyHref(exerciseHistoryKey(item))}
            className="interactive body-4 inline-flex items-center gap-2 py-1 text-text-primary hover:text-accent-text active:scale-98"
            aria-label={`Ver historial de ${item.exercise.name}`}
        >
            {item.exercise.name}
            <ChartLineUp size={16} weight="bold" className="shrink-0 text-text-muted" aria-hidden="true" />
        </Link>
    );
}

// ─── Vista Template (Plan Futuro) ──────────────────────────────────

function TemplateSummary({
    template,
    stagnant,
}: {
    template: IRoutineTemplate;
    stagnant: ReadonlySet<string>;
}) {
    return (
        <div className="flex flex-col gap-3">
            {template.exercises.map((re) => {
                const scheme = re.sets.length > 0
                    ? `${re.sets.length}×${re.sets[0].targetReps}`
                    : "—";
                const weight = re.sets[0]?.targetWeight ?? 0;

                return (
                    <div
                        key={re.exercise.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
                    >
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <ExerciseNameLink item={re} />
                            <span className="caption-5 text-text-muted">
                                {weight > 0 ? `${scheme} · ${weight}kg` : scheme}
                            </span>
                            {isExerciseStagnant(stagnant, re) && (
                                <div className="mt-2">
                                    <StagnationNotice />
                                </div>
                            )}
                        </div>
                        <span className="caption-4 shrink-0 rounded-full bg-accent-soft px-2 py-1 text-accent-text">
                            {scheme}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Vista Log (Registro Pasado) ───────────────────────────────────

function LogSummary({ log, stagnant }: { log: IWorkoutLog; stagnant: ReadonlySet<string> }) {
    return (
        <div className="flex flex-col gap-3">
            {log.exercises.map((we) => (
                <div
                    key={we.exercise.id}
                    className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised"
                >
                    <div className="flex items-center justify-between gap-3 bg-surface-overlay px-4 py-2">
                        <ExerciseNameLink item={we} />
                        <span className="caption-5 shrink-0 text-text-muted">
                            {we.sets.length} serie{we.sets.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                        {isExerciseStagnant(stagnant, we) && (
                            <div className="mb-2">
                                <StagnationNotice />
                            </div>
                        )}
                        {we.sets.map((s) => (
                            <div
                                key={s.setNumber}
                                className="caption-5 flex items-center gap-3 text-text-secondary"
                            >
                                <span className="caption-3 w-6 text-text-muted">
                                    S{s.setNumber}
                                </span>
                                <span className="caption-4 font-mono text-text-primary">
                                    {s.actualReps} reps
                                </span>
                                <span className="text-text-muted">×</span>
                                <span className="caption-4 font-mono text-text-primary">
                                    {s.actualWeight}kg
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
