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
                        className="flex items-center justify-between rounded-xl bg-zinc-900/80 border border-zinc-800 px-4 py-3"
                    >
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-white">
                                {re.exercise.name}
                            </span>
                            <span className="text-xs text-zinc-500">
                                {scheme} · {weight}kg
                            </span>
                        </div>
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
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
                    className="rounded-xl bg-zinc-900/80 border border-zinc-800 overflow-hidden"
                >
                    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/50">
                        <span className="text-sm font-semibold text-white">
                            {we.exercise.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                            {we.sets.length} serie{we.sets.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                        {we.sets.map((s) => (
                            <div
                                key={s.setNumber}
                                className="flex items-center gap-3 text-xs text-zinc-400"
                            >
                                <span className="w-5 font-bold text-zinc-600">
                                    S{s.setNumber}
                                </span>
                                <span className="text-white font-medium">
                                    {s.actualReps} reps
                                </span>
                                <span className="text-zinc-500">×</span>
                                <span className="text-white font-medium">
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
