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
        <div className="flex min-h-dvh flex-col bg-surface-base">
            {/* Progress */}
            <div className="px-4 pb-4 pt-6">
                <p className="caption-3 uppercase tracking-wider text-accent-text">
                    Paso {step} de {TOTAL_STEPS}
                </p>
                <div className="mt-2 flex gap-1">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                        <div key={i} className={`interactive h-1 flex-1 rounded-full ${i < step ? "bg-accent-hover" : "bg-surface-strong"}`} />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 pb-24">
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
            <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 bg-surface-base/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
                {step > 1 && (
                    <button
                        type="button"
                        onClick={() => setStep((s) => (s - 1) as Step)}
                        disabled={isSaving}
                        className="btn-secondary button-md"
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
                        {isSaving ? "Guardando…" : "Finalizar configuración"}
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
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="btn-primary button-md flex-1"
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
                <h2 className="heading-6 text-text-primary">Confirmar rutina</h2>
                <p className="body-6 mt-1 text-text-muted">Revisá tu plan semanal antes de guardar.</p>
            </div>
            {dayExercises.map((day) => (
                <div key={day.dayName} className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised">
                    <div className="bg-surface-overlay px-4 py-2">
                        <span className="body-4 text-text-primary">
                            {day.dayLabel ?? DAY_LABELS[day.dayName] ?? day.dayName}
                        </span>
                        <span className="caption-5 ml-2 text-text-muted">
                            {DAY_LABELS[day.dayName] ?? ""}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2 p-3">
                        {day.exercises.map((ex) => (
                            <div key={ex.id} className="flex items-center justify-between gap-3">
                                <span className="body-6 min-w-0 text-text-primary">{ex.name}</span>
                                <span className="caption-5 shrink-0 font-mono text-text-muted">
                                    {ex.targetSets}×{ex.targetReps}
                                    {ex.initialWeight > 0 ? ` · ${ex.initialWeight}kg` : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {saveError && (
                <div role="alert" className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3">
                    <p className="body-6 text-danger-text">{saveError}</p>
                </div>
            )}
        </div>
    );
}
