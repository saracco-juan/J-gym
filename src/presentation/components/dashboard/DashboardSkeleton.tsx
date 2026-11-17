/**
 * DashboardSkeleton — loading placeholders shaped like the real dashboard:
 * the week calendar followed by the exercise cards. Presentational.
 */

const DAY_SLOTS = 7;
const CARD_SLOTS = 5;

/** Five exercise cards, the shape of the template and log summaries. */
export function ExerciseListSkeleton() {
    return (
        <div role="status" aria-label="Cargando ejercicios" className="flex flex-col gap-3">
            {Array.from({ length: CARD_SLOTS }, (_, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
                >
                    <div className="flex flex-col gap-2">
                        <div className="skeleton h-4 w-40 rounded-lg" />
                        <div className="skeleton h-3 w-24 rounded-lg" />
                    </div>
                    <div className="skeleton h-6 w-12 rounded-full" />
                </div>
            ))}
        </div>
    );
}

/** Calendar row plus exercise cards, shown while the dashboard resolves. */
export default function DashboardSkeleton() {
    return (
        <div role="status" aria-label="Cargando dashboard" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="skeleton size-12 rounded-xl" />
                    <div className="skeleton h-4 w-32 rounded-lg" />
                    <div className="skeleton size-12 rounded-xl" />
                </div>
                <div className="flex gap-2">
                    {Array.from({ length: DAY_SLOTS }, (_, i) => (
                        <div key={i} className="skeleton h-16 flex-1 rounded-xl" />
                    ))}
                </div>
            </div>
            <div className="px-4 pb-8">
                <ExerciseListSkeleton />
            </div>
        </div>
    );
}
