"use client";

/**
 * WeekSwapPanel — "Esta semana": the 7 days of the current week with the
 * routine each one shows, and swapping two days for this week only.
 */

import { weekdayLabel } from "@/core/routine";
import SwapDaySheet, { routineCaption } from "./SwapDaySheet";
import { useWeekSwap } from "./useWeekSwap";
import type { SwapBlockReason } from "@/core/schedule";

const RESET_BLOCK_LABELS: Partial<Record<SwapBlockReason, string>> = {
    past: "uno de los días intercambiados ya pasó.",
    logged: "ya entrenaste un día intercambiado.",
    "session-in-progress": "tenés un entrenamiento en curso hoy.",
};

function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="caption-4 rounded-full border border-surface-border px-2 py-0.5 text-text-muted">
            {children}
        </span>
    );
}

export default function WeekSwapPanel() {
    const { plan, loadError, actionError, isBusy, swappable, source, sourceOptions, actions } =
        useWeekSwap();

    if (loadError) {
        return (
            <p role="alert" className="caption-5 px-4 text-danger-text">
                No se pudo cargar tu semana.
            </p>
        );
    }
    if (!plan) return null;

    return (
        <section aria-labelledby="week-swap-title" className="flex flex-col gap-3 px-4">
            <div>
                <h2 id="week-swap-title" className="heading-6 text-text-primary">
                    Esta semana
                </h2>
                <p className="caption-5 text-text-muted">
                    Cambiá el orden de tus días solo por esta semana. La próxima vuelve a la normalidad.
                </p>
            </div>

            {actionError && (
                <p role="alert" className="caption-5 text-danger-text">
                    {actionError}
                </p>
            )}

            <ul className="flex flex-col gap-2">
                {plan.days.map((day) => (
                    <li
                        key={day.date}
                        className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                            day.isToday ? "border-accent" : "border-surface-border"
                        } bg-surface-raised ${day.isPast ? "opacity-60" : ""}`}
                    >
                        <div className="flex min-w-0 flex-col">
                            <span className="body-5 flex flex-wrap items-center gap-2 text-text-primary">
                                {weekdayLabel(day.naturalDayName)}
                                {day.isToday && <Tag>Hoy</Tag>}
                                {day.swapped && <Tag>Intercambiado</Tag>}
                            </span>
                            <span className="caption-5 text-text-muted">
                                {routineCaption(day)}
                                {day.logged ? " · Entrenado" : ""}
                            </span>
                        </div>
                        {swappable.has(day.date) && (
                            <button
                                type="button"
                                onClick={() => actions.open(day.date)}
                                disabled={isBusy}
                                className="btn-secondary button-sm shrink-0"
                            >
                                Intercambiar
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            {plan.hasSwaps && (
                <div className="flex flex-col gap-1">
                    <button
                        type="button"
                        onClick={actions.reset}
                        disabled={isBusy || plan.resetBlocked !== null}
                        className="btn-secondary button-md"
                    >
                        Restablecer semana
                    </button>
                    {plan.resetBlocked && (
                        <p className="caption-5 text-text-muted">
                            No se puede restablecer: {RESET_BLOCK_LABELS[plan.resetBlocked]}
                        </p>
                    )}
                </div>
            )}

            {source && (
                <SwapDaySheet
                    source={source}
                    options={sourceOptions}
                    isBusy={isBusy}
                    onSelect={actions.swapWith}
                    onClose={actions.close}
                />
            )}
        </section>
    );
}
