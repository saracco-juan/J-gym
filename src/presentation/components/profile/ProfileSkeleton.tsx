/**
 * ProfileSkeleton: placeholders shaped like the profile form (avatar, name
 * field, color swatches, save button). Presentational.
 */

const SWATCH_SLOTS = 8;

export default function ProfileSkeleton() {
    return (
        <div role="status" aria-label="Cargando perfil" className="flex flex-col gap-6 px-4 py-4">
            <div className="skeleton size-12 rounded-xl" />
            <div className="flex flex-col items-center gap-4">
                <div className="skeleton size-24 rounded-full" />
                <div className="skeleton h-12 w-full rounded-xl" />
            </div>
            <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: SWATCH_SLOTS }, (_, i) => (
                    <div key={i} className="skeleton size-12 justify-self-center rounded-full" />
                ))}
            </div>
            <div className="skeleton h-12 w-full rounded-xl" />
        </div>
    );
}
