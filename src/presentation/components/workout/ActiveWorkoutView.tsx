"use client";

/**
 * ActiveWorkoutView — Contenedor principal de la sesión de entrenamiento.
 *
 * Lee activeTemplate del store:
 * - null → estado vacío
 * - template → lista de ExerciseCards + botón Finalizar
 *
 * Carga PRs anteriores al iniciar y los pasa a cada ExerciseCard.
 * Usa useFinishWorkout para orquestar el guardado al servidor.
 */

import { useState, useEffect } from "react";
import { useWorkoutStore } from "@/presentation/stores/useWorkoutStore";
import ExerciseCard from "./ExerciseCard";
import WeightInputModal from "./WeightInputModal";
import { useFinishWorkout } from "./useFinishWorkout";
import { Dumbbell, Trophy } from "lucide-react";
import { fetchExercisePRs } from "@/app/actions/workoutActions";

export default function ActiveWorkoutView() {
    const activeTemplate = useWorkoutStore((s) => s.activeTemplate);
    const logSet = useWorkoutStore((s) => s.logSet);
    const { handleFinish, isSaving, saveError, setSaveError, newPRs } = useFinishWorkout();
    const [prs, setPrs] = useState<Record<string, number>>({});

    // ─── Cargar PRs al iniciar ────────────────────────────────

    useEffect(() => {
        if (!activeTemplate) return;
        const names = activeTemplate.exercises.map((e) => e.exercise.name);
        fetchExercisePRs(names).then(setPrs).catch(() => { });
    }, [activeTemplate]);

    // ─── Estado vacío ──────────────────────────────────────────

    if (!activeTemplate) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl">
                    <Dumbbell size={28} className="text-zinc-400" />
                </div>
                <h2 className="text-lg font-bold text-white text-center">
                    Sin entrenamiento activo
                </h2>
                <p className="text-sm text-zinc-500 text-center max-w-xs">
                    Seleccioná una rutina desde el calendario para comenzar tu sesión.
                </p>
            </div>
        );
    }

    // ─── Sesión activa ─────────────────────────────────────────

    return (
        <div className="flex flex-col gap-4 pb-28">
            {/* Header */}
            <div className="px-4 pt-4">
                <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                    Entrenamiento activo
                </p>
                <h1 className="text-2xl font-bold text-white mt-1">
                    {activeTemplate.dayName}
                </h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                    {activeTemplate.exercises.length} ejercicio{activeTemplate.exercises.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* New PR celebration */}
            {newPRs && newPRs.length > 0 && (
                <div className="mx-4 rounded-xl bg-yellow-900/30 border border-yellow-700/50 px-4 py-3">
                    <p className="text-sm font-bold text-yellow-300">
                        <Trophy size={16} className="inline mr-1" /> Nuevo{newPRs.length > 1 ? "s" : ""} Récord Personal!
                    </p>
                    <p className="text-xs text-yellow-400/80 mt-1">
                        {newPRs.join(", ")}
                    </p>
                </div>
            )}

            {/* Error de guardado */}
            {saveError && (
                <div className="mx-4 flex items-center gap-3 rounded-xl bg-red-900/30 border border-red-700/50 px-4 py-3">
                    <span className="text-sm text-red-300 flex-1">{saveError}</span>
                    <button
                        onClick={() => setSaveError(null)}
                        className="text-xs font-semibold text-red-400 hover:text-red-300 shrink-0"
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {/* Lista de ejercicios */}
            <div className="flex flex-col gap-3 px-4">
                {activeTemplate.exercises.map((routineExercise) => (
                    <ExerciseCard
                        key={routineExercise.exercise.id}
                        routineExercise={routineExercise}
                        personalRecord={prs[routineExercise.exercise.name]}
                        onLogSet={logSet}
                    />
                ))}
            </div>

            {/* Botón Finalizar (fijo abajo) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">
                <button
                    onClick={handleFinish}
                    disabled={isSaving}
                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white text-base transition-all shadow-lg shadow-emerald-900/30 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {isSaving ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                            Guardando...
                        </span>
                    ) : (
                        "Finalizar Entrenamiento"
                    )}
                </button>
            </div>

            {/* Modal de peso (condicional, post-evaluación) */}
            <WeightInputModal />
        </div>
    );
}
