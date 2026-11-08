"use client";

/**
 * OnboardingWizard — Flujo paso a paso para configurar la rutina semanal.
 *
 * Paso 1: Seleccionar días
 * Paso 2: Elegir tipo de rutina (default / custom)
 * Paso 3: Editar ejercicios (pre-loaded con nombres o desde cero)
 * Paso 4: Confirmar y guardar
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import DaySelector from "./DaySelector";
import RoutineTypeSelector from "./RoutineTypeSelector";
import ExerciseSetup from "./ExerciseSetup";
import type { DayExercises } from "./ExerciseSetup";
import { generateDefaultRoutine, wizardToRoutineExercises } from "./defaultRoutine";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { saveWeeklyRoutine, type WeeklyRoutineInput } from "@/infrastructure/local/queries";
import { useSyncStore } from "@/presentation/stores/useSyncStore";

type Step = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

const DAY_LABELS: Record<string, string> = {
    lunes: "Lunes", martes: "Martes", miércoles: "Miércoles",
    jueves: "Jueves", viernes: "Viernes", sábado: "Sábado", domingo: "Domingo",
};

export default function OnboardingWizard() {
    const router = useRouter();
    const userId = useSyncStore((s) => s.userId);
    const [step, setStep] = useState<Step>(1);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [routineType, setRoutineType] = useState<"default" | "custom" | null>(null);
    const [dayExercises, setDayExercises] = useState<DayExercises[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // ─── Step 1 ──────────────────────────────────────────────

    const toggleDay = useCallback((day: string) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    }, []);

    // ─── Step 2 → 3 ─────────────────────────────────────────

    const goToStep3 = useCallback(() => {
        if (routineType === "default") {
            setDayExercises(generateDefaultRoutine(selectedDays));
        } else {
            setDayExercises((prev) =>
                selectedDays.map((day) => prev.find((d) => d.dayName === day) ?? { dayName: day, exercises: [] })
            );
        }
        setStep(3);
    }, [routineType, selectedDays]);

    // ─── Validation ──────────────────────────────────────────

    const allExercisesComplete = useMemo(() => {
        return dayExercises.every((d) =>
            d.exercises.length > 0 &&
            d.exercises.every((e) =>
                e.name.trim() && e.targetSets > 0 && e.targetReps > 0
            )
        );
    }, [dayExercises]);

    // ─── Save ────────────────────────────────────────────────

    const buildTemplates = useCallback((): WeeklyRoutineInput[] => {
        return dayExercises.map((day) => ({
            dayName: day.dayName,
            exercises: wizardToRoutineExercises(day.exercises),
        }));
    }, [dayExercises]);

    const handleSave = useCallback(async () => {
        if (!userId) {
            setSaveError("No se encontró tu sesión. Volvé a iniciar sesión.");
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
            // Local write (works offline); the sync engine uploads it later.
            await saveWeeklyRoutine(getLocalRepositories(), userId, buildTemplates());
            router.push("/dashboard");
        } catch {
            setSaveError("No se pudo guardar la rutina en el dispositivo. Intentá de nuevo.");
            setIsSaving(false);
        }
    }, [buildTemplates, router, userId]);

    // ─── Render ──────────────────────────────────────────────

    return (
        <div className="flex flex-col min-h-screen bg-zinc-950">
            {/* Progress */}
            <div className="px-4 pt-6 pb-4">
                <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                    Paso {step} de {TOTAL_STEPS}
                </p>
                <div className="flex gap-1 mt-2">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? "bg-emerald-500" : "bg-zinc-800"}`} />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 pb-28">
                {step === 1 && <DaySelector selectedDays={selectedDays} onToggle={toggleDay} />}

                {step === 2 && <RoutineTypeSelector selected={routineType} onSelect={setRoutineType} />}

                {step === 3 && (
                    <ExerciseSetup
                        days={dayExercises}
                        onUpdate={setDayExercises}
                        preLoaded={routineType === "default"}
                    />
                )}

                {step === 4 && (
                    <SummaryView dayExercises={dayExercises} saveError={saveError} />
                )}
            </div>

            {/* Navigation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent flex gap-3">
                {step > 1 && (
                    <button
                        onClick={() => setStep((s) => (s - 1) as Step)}
                        disabled={isSaving}
                        className="h-14 px-6 rounded-2xl bg-zinc-800 text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        Atrás
                    </button>
                )}

                {step === 1 && (
                    <NavButton onClick={() => setStep(2)} disabled={selectedDays.length === 0}>
                        Siguiente
                    </NavButton>
                )}

                {step === 2 && (
                    <NavButton onClick={goToStep3} disabled={!routineType}>
                        Siguiente
                    </NavButton>
                )}

                {step === 3 && (
                    <NavButton onClick={() => setStep(4)} disabled={!allExercisesComplete}>
                        Revisar
                    </NavButton>
                )}

                {step === 4 && (
                    <NavButton onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                                Guardando...
                            </span>
                        ) : (
                            "Finalizar Configuración"
                        )}
                    </NavButton>
                )}
            </div>
        </div>
    );
}

// ─── Subcomponentes ────────────────────────────────────────────────

function NavButton({ onClick, disabled, children }: {
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white text-base transition-all disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
        >
            {children}
        </button>
    );
}

function SummaryView({ dayExercises, saveError }: {
    dayExercises: DayExercises[];
    saveError: string | null;
}) {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-xl font-bold text-white">Confirmar Rutina</h2>
                <p className="text-sm text-zinc-500 mt-1">Revisá tu plan semanal antes de guardar.</p>
            </div>
            {dayExercises.map((day) => (
                <div key={day.dayName} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-zinc-800/50">
                        <span className="text-sm font-bold text-white">
                            {day.dayLabel ?? DAY_LABELS[day.dayName] ?? day.dayName}
                        </span>
                        <span className="text-xs text-zinc-500 ml-2">
                            {DAY_LABELS[day.dayName] ?? ""}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                        {day.exercises.map((ex) => (
                            <div key={ex.id} className="flex items-center justify-between text-sm">
                                <span className="text-white">{ex.name}</span>
                                <span className="text-xs text-zinc-500">
                                    {ex.targetSets}×{ex.targetReps}
                                    {ex.initialWeight > 0 ? ` · ${ex.initialWeight}kg` : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {saveError && (
                <div className="rounded-xl bg-red-900/20 border border-red-800/50 px-4 py-3">
                    <p className="text-sm text-red-300">{saveError}</p>
                </div>
            )}
        </div>
    );
}
