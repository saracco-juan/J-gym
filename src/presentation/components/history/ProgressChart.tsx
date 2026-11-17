/**
 * ProgressChart — hand written responsive SVG line chart of one value per
 * session. Flat background, accent line, axis labels in the caption style.
 * Presentational: no dependency, no animation.
 *
 * The SVG scales with its container (viewBox + width 100%), so it fits a
 * 390px phone as well as a wider screen. Sessions are spaced evenly; the x
 * axis labels the first and last date.
 */

import { formatWeight } from "@/core/session";
import type { ProgressPoint } from "@/core/progress";

interface ProgressChartProps {
    points: readonly ProgressPoint[];
    metric: "weight" | "reps";
    /** Accessible summary read instead of the drawing. */
    label: string;
}

const WIDTH = 320;
const HEIGHT = 176;
const PAD = { top: 12, right: 12, bottom: 28, left: 44 };
const TICKS = 3;

function formatTick(value: number, metric: "weight" | "reps"): string {
    return metric === "weight" ? `${formatWeight(value)}kg` : String(Math.round(value));
}

function formatDay(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
    });
}

/** Y range with a little headroom, snapped to whole numbers so ticks read cleanly. */
function yRange(values: readonly number[]): { lo: number; hi: number } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.15, 1);
    return { lo: Math.max(0, Math.floor(min - pad)), hi: Math.ceil(max + pad) };
}

export default function ProgressChart({ points, metric, label }: ProgressChartProps) {
    if (points.length === 0) return null;

    const { lo, hi } = yRange(points.map((p) => p.value));
    const plotW = WIDTH - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;

    const x = (i: number) =>
        PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
    const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo)) * plotH;

    const ticks = Array.from({ length: TICKS }, (_, i) => lo + ((hi - lo) * i) / (TICKS - 1));
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
    const last = points.length - 1;

    return (
        <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block h-auto w-full"
            role="img"
            aria-label={label}
        >
            {ticks.map((tick) => (
                <g key={tick}>
                    <line
                        x1={PAD.left}
                        x2={WIDTH - PAD.right}
                        y1={y(tick)}
                        y2={y(tick)}
                        className="stroke-surface-border"
                        strokeWidth={1}
                    />
                    <text
                        x={PAD.left - 8}
                        y={y(tick)}
                        textAnchor="end"
                        dominantBaseline="middle"
                        className="caption-5 fill-text-muted"
                    >
                        {formatTick(tick, metric)}
                    </text>
                </g>
            ))}

            {points.length > 1 && (
                <path
                    d={path}
                    fill="none"
                    className="stroke-accent-hover"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
            {points.map((p, i) => (
                <circle
                    key={p.date}
                    cx={x(i)}
                    cy={y(p.value)}
                    r={i === last ? 4 : 3}
                    className="fill-accent-hover"
                />
            ))}

            <text
                x={x(0)}
                y={HEIGHT - 8}
                textAnchor={points.length === 1 ? "middle" : "start"}
                className="caption-5 fill-text-muted"
            >
                {formatDay(points[0].date)}
            </text>
            {points.length > 1 && (
                <text x={x(last)} y={HEIGHT - 8} textAnchor="end" className="caption-5 fill-text-muted">
                    {formatDay(points[last].date)}
                </text>
            )}
        </svg>
    );
}
