/**
 * HistorySkeleton — loading placeholders shaped like the history screen:
 * title, two stat cards, the chart card and a few session rows. Presentational.
 */

const SESSION_SLOTS = 4;

export default function HistorySkeleton() {
    return (
        <div role="status" aria-label="Cargando historial" className="flex flex-col gap-4 px-4 pb-8">
            <div className="flex flex-col gap-2">
                <div className="skeleton h-6 w-48 rounded-lg" />
                <div className="skeleton h-3 w-32 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="skeleton h-24 rounded-xl" />
                <div className="skeleton h-24 rounded-xl" />
            </div>
            <div className="skeleton h-52 rounded-xl" />
            <div className="flex flex-col gap-3">
                {Array.from({ length: SESSION_SLOTS }, (_, i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                ))}
            </div>
        </div>
    );
}
