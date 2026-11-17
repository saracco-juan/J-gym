"use client";

/**
 * RoutineSummary — Renderiza la lista de ejercicios para un día.
 *
 * Acepta dos modos via discriminated union:
 * - "template": Muestra el plan (series/reps objetivo)
 * - "log": Muestra lo realizado (series/reps/peso logrados) — Solo lectura
 */

import type { IRoutineTemplate } from "@/core/domain/routine-template";
import type { IWorkoutLog } from "@/core/domain/workout-log";

type RoutineSummaryProps =
    | { mode: "template"; template: IRoutineTemplate }
    | { mode: "log"; log: IWorkoutLog };

export default function RoutineSummary(props: RoutineSummaryProps) {
    if (props.mode === "template") {
        return <TemplateSummary template={props.template} />;
    }
    return <LogSummary log={props.log} />;
}

// ─── Vista Template (Plan Futuro) ──────────────────────────────────

function TemplateSummary({ template }: { template: IRoutineTemplate }) {
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
                            <span className="body-4 text-text-primary">
                                {re.exercise.name}
                            </span>
                            <span className="caption-5 text-text-muted">
                                {weight > 0 ? `${scheme} · ${weight}kg` : scheme}
                            </span>
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

function LogSummary({ log }: { log: IWorkoutLog }) {
    return (
        <div className="flex flex-col gap-3">
            {log.exercises.map((we) => (
                <div
                    key={we.exercise.id}
                    className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised"
                >
                    <div className="flex items-center justify-between gap-3 bg-surface-overlay px-4 py-2">
                        <span className="body-4 min-w-0 text-text-primary">
                            {we.exercise.name}
                        </span>
                        <span className="caption-5 shrink-0 text-text-muted">
                            {we.sets.length} serie{we.sets.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3">
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
