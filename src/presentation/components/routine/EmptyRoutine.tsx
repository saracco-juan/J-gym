/**
 * EmptyRoutine — composed empty state for a routine without days.
 * Presentational.
 */

import { CalendarPlus } from "@phosphor-icons/react";

export default function EmptyRoutine({ onAddDay }: { onAddDay: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-xl border border-surface-border bg-surface-raised">
                <CalendarPlus size={32} weight="bold" className="text-text-muted" />
            </div>
            <h2 className="title-2 text-text-primary">Tu rutina no tiene días</h2>
            <p className="body-6 max-w-xs text-text-secondary">
                Agrega un día de la semana y arma sus ejercicios.
            </p>
            <button type="button" onClick={onAddDay} className="btn-primary button-md">
                Agregar día
            </button>
        </div>
    );
}
