"use client";

/**
 * HistoryContent — body of the exercise history screen: stagnation notice,
 * personal record, chart and session list. Presentational.
 */

import { ChartLineUp, Trophy } from "@phosphor-icons/react";
import {
    formatStagnationSuggestion,
    suggestStagnationAction,
    type ExerciseSession,
} from "@/core/progress";
import { exerciseStatusLabel, formatSetValue, formatWeight } from "@/core/session";
import type { ExerciseHistoryResult } from "@/infrastructure/local/queries";
import StagnationNotice from "@/presentation/components/ui/StagnationNotice";
import ExerciseStatusBadge from "@/presentation/components/workout/ExerciseStatusBadge";
import ProgressChart from "./ProgressChart";

function formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/** Suggestion from the most recent session that logged a set. */
function stagnationText(history: ExerciseHistoryResult): string | null {
    const latest = [...history.sessions].reverse().find((s) => s.bestWeight > 0 || s.bestReps > 0);
    if (!latest) return null;
    const suggestion = suggestStagnationAction({
        weight: latest.bestWeight,
        reps: latest.bestReps,
        isBodyweight: history.isBodyweight,
    });
    return suggestion ? formatStagnationSuggestion(suggestion) : null;
}

function bestSetText(session: ExerciseSession, isBodyweight: boolean): string {
    if (session.bestReps <= 0 && session.bestWeight <= 0) return "Sin series";
    return formatSetValue(session.bestReps, session.bestWeight, isBodyweight);
}

export default function HistoryContent({ history }: { history: ExerciseHistoryResult }) {
    const { sessions, record, series, isBodyweight } = history;
    const recent = [...sessions].reverse();

    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex size-16 items-center justify-center rounded-xl border border-surface-border bg-surface-raised">
                    <ChartLineUp size={32} weight="bold" className="text-text-muted" />
                </div>
                <h2 className="title-2 text-text-primary">Todavía no hay historial</h2>
                <p className="body-6 max-w-xs text-text-secondary">
                    Cuando registres este ejercicio en un entrenamiento, vas a ver acá tu progreso sesión por sesión.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {history.stagnant && <StagnationNotice suggestion={stagnationText(history)} />}

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                    <p className="caption-4 flex items-center gap-1 text-warning-text">
                        <Trophy size={16} weight="bold" /> Récord personal
                    </p>
                    <p className="title-1 mt-1 font-mono text-text-primary">
                        {record
                            ? record.weight > 0
                                ? `${formatWeight(record.weight)}kg`
                                : `${record.reps} reps`
                            : "—"}
                    </p>
                    {record && (
                        <p className="caption-5 text-text-muted">
                            {record.weight > 0 ? `${record.reps} reps · ` : ""}
                            {formatDate(record.date)}
                        </p>
                    )}
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                    <p className="caption-4 text-text-secondary">Sesiones</p>
                    <p className="title-1 mt-1 font-mono text-text-primary">{sessions.length}</p>
                    <p className="caption-5 text-text-muted">desde {formatDate(sessions[0].date)}</p>
                </div>
            </div>

            <section className="rounded-xl border border-surface-border bg-surface-raised p-4" aria-labelledby="chart-title">
                <h2 id="chart-title" className="title-3 text-text-primary">
                    {series.metric === "weight" ? "Mejor peso por sesión" : "Mejores repeticiones por sesión"}
                </h2>
                {series.points.length > 0 ? (
                    <div className="mt-3">
                        <ProgressChart
                            points={series.points}
                            metric={series.metric}
                            label={`Gráfico de ${series.metric === "weight" ? "mejor peso" : "mejores repeticiones"} en ${series.points.length} sesiones`}
                        />
                    </div>
                ) : (
                    <p className="body-6 mt-2 text-text-secondary">
                        Todavía no hay series registradas para dibujar el gráfico.
                    </p>
                )}
            </section>

            <section aria-labelledby="sessions-title" className="flex flex-col gap-3">
                <h2 id="sessions-title" className="title-3 text-text-primary">
                    Sesiones
                </h2>
                <ul className="flex flex-col gap-3">
                    {recent.map((session) => (
                        <li
                            key={session.logId}
                            className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
                        >
                            <div className="min-w-0">
                                <p className="body-4 text-text-primary">{formatDate(session.date)}</p>
                                <p className="caption-5 font-mono text-text-muted">
                                    {bestSetText(session, isBodyweight)}
                                </p>
                            </div>
                            {session.status && <ExerciseStatusBadge status={exerciseStatusLabel(session.status)} />}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

