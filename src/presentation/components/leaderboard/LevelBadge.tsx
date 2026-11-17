/**
 * LevelBadge: "Nivel 3" pill. Presentational.
 */

export default function LevelBadge({ level }: { level: number }) {
    return (
        <span className="caption-3 inline-flex shrink-0 items-center rounded-full border border-accent-border bg-accent-soft px-2 py-1 text-accent-text">
            Nivel {level}
        </span>
    );
}
