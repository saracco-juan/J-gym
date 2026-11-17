/**
 * RoutineEditorSkeleton — loading placeholders shaped like the routine
 * editor: title, day tabs and exercise cards. Presentational.
 */

const TAB_SLOTS = 4;
const CARD_SLOTS = 3;

export default function RoutineEditorSkeleton() {
    return (
        <div role="status" aria-label="Cargando rutina" className="flex flex-col gap-4 px-4 pb-24">
            <div className="flex flex-col gap-2">
                <div className="skeleton h-6 w-40 rounded-lg" />
                <div className="skeleton h-3 w-56 rounded-lg" />
            </div>
            <div className="flex gap-2">
                {Array.from({ length: TAB_SLOTS }, (_, i) => (
                    <div key={i} className="skeleton h-12 w-24 shrink-0 rounded-xl" />
                ))}
            </div>
            <div className="flex flex-col gap-3">
                {Array.from({ length: CARD_SLOTS }, (_, i) => (
                    <div key={i} className="skeleton h-40 rounded-xl" />
                ))}
            </div>
        </div>
    );
}
