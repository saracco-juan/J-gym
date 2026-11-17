/**
 * LeaderboardSkeleton: placeholders shaped like the board (tabs and rows).
 * Presentational.
 */

const ROW_SLOTS = 6;

export default function LeaderboardSkeleton() {
    return (
        <div role="status" aria-label="Cargando la tabla" className="flex flex-col gap-4">
            <div className="skeleton h-14 w-full rounded-xl" />
            <div className="flex flex-col gap-2">
                {Array.from({ length: ROW_SLOTS }, (_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-3 py-2"
                    >
                        <div className="skeleton h-4 w-6 rounded-lg" />
                        <div className="skeleton size-10 rounded-full" />
                        <div className="flex flex-1 flex-col gap-2">
                            <div className="skeleton h-4 w-32 rounded-lg" />
                            <div className="skeleton h-4 w-20 rounded-full" />
                        </div>
                        <div className="skeleton h-4 w-12 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}
