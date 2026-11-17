/**
 * WorkoutSkeleton — loading placeholders shaped like the active workout:
 * header lines followed by exercise cards. Presentational.
 */

const CARD_SLOTS = 3;
const SET_SLOTS = 3;

export default function WorkoutSkeleton() {
    return (
        <div role="status" aria-label="Cargando entrenamiento" className="flex flex-col gap-4 pb-24">
            <div className="flex flex-col gap-2 px-4 pt-4">
                <div className="skeleton h-3 w-32 rounded-lg" />
                <div className="skeleton h-6 w-48 rounded-lg" />
                <div className="skeleton h-4 w-24 rounded-lg" />
            </div>
            <div className="flex flex-col gap-3 px-4">
                {Array.from({ length: CARD_SLOTS }, (_, i) => (
                    <div
                        key={i}
                        className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-surface-border bg-surface-raised"
                    >
                        <div className="bg-surface-overlay px-4 py-3">
                            <div className="skeleton h-5 w-40 rounded-lg" />
                        </div>
                        <div className="flex flex-col gap-2 p-4">
                            {Array.from({ length: SET_SLOTS }, (_, j) => (
                                <div key={j} className="skeleton h-12 w-full rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
