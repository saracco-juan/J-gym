"use client";

/**
 * ExerciseCard — Tarjeta individual por ejercicio.
 *
 * Muestra el nombre del ejercicio, esquema objetivo (ej. 3×12),
 * badge de PR si existe, y mapea sus series como SetRow.
 */

import type { IRoutineExercise } from "@/core/domain/routine-template";
import SetRow from "./SetRow";
import { Trophy } from "lucide-react";

interface ExerciseCardProps {
    routineExercise: IRoutineExercise;
    personalRecord?: number;
    /** Logged values per set index (null = not logged yet). */
    loggedSets?: ({ reps: number; weight: number } | null)[];
    onLogSet: (exerciseId: string, setIndex: number, reps: number, weight: number) => void;
}

export default function ExerciseCard({
    routineExercise,
    personalRecord,
    loggedSets,
    onLogSet,
}: ExerciseCardProps) {
    const { exercise, sets } = routineExercise;

    const schemaSummary = sets.length > 0
        ? `${sets.length}×${sets[0].targetReps} · ${sets[0].targetWeight}kg`
        : "Sin series";

    return (
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/50">
                <h3 className="text-base font-bold text-white truncate">
                    {exercise.name}
                </h3>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    {personalRecord != null && personalRecord > 0 && (
                        <span className="text-xs font-bold text-yellow-800 bg-yellow-100 px-2 py-1 rounded-full">
                            <Trophy size={12} className="inline mr-0.5" /> PR: {personalRecord}kg
                        </span>
                    )}
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                        {schemaSummary}
                    </span>
                </div>
            </div>

            {/* Series */}
            <div className="flex flex-col gap-2 p-3">
                {sets.map((setPlan, index) => (
                    <SetRow
                        key={`${exercise.id}-set-${index}`}
                        exerciseId={exercise.id}
                        setIndex={index}
                        targetReps={setPlan.targetReps}
                        targetWeight={setPlan.targetWeight}
                        initialLogged={loggedSets?.[index] ?? null}
                        onLog={onLogSet}
                    />
                ))}
            </div>
        </div>
    );
}
