"use client";

/**
 * RoutineEditor — edit the weekly routine after onboarding: add or delete
 * days, and per day add, remove and reorder exercises and edit their sets,
 * reps and target weight. Saves locally and syncs through the outbox.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "@phosphor-icons/react";
import { weekdayLabel } from "@/core/routine";
import BackButton from "@/presentation/components/ui/BackButton";
import ConfirmSheet from "@/presentation/components/ui/ConfirmSheet";
import ExercisePicker from "@/presentation/components/workout/ExercisePicker";
import AddDaySheet from "./AddDaySheet";
import EmptyRoutine from "./EmptyRoutine";
import ExerciseEditorCard from "./ExerciseEditorCard";
import RoutineEditorSkeleton from "./RoutineEditorSkeleton";
import { useRoutineEditor } from "./useRoutineEditor";

type Sheet = "add-day" | "add-exercise" | "delete-day" | "discard" | null;

function Alert({ children }: { children: React.ReactNode }) {
    return (
        <div role="alert" className="mx-4 rounded-xl border border-danger-border bg-danger-soft px-4 py-3">
            <p className="body-6 text-danger-text">{children}</p>
        </div>
    );
}

export default function RoutineEditor() {
    const router = useRouter();
    const editor = useRoutineEditor();
    const [sheet, setSheet] = useState<Sheet>(null);
    const { activeDay, draft, issues, actions } = editor;

    if (editor.isLoading) return <RoutineEditorSkeleton />;
    if (editor.loadError) return <Alert>No se pudo cargar tu rutina. Cierra la pantalla e intenta de nuevo.</Alert>;

    const dayIssue = (field: "days" | "exercises") => issues.find((i) => i.field === field && (field === "days" || i.dayId === activeDay?.id));
    const isDayInProgress = activeDay !== null && activeDay.id === editor.activeTemplateId;
    const goBack = () => (window.history.length > 1 ? router.back() : router.push("/dashboard"));
    const requestBack = () => (editor.isDirty ? setSheet("discard") : goBack());

    return (
        <div className="flex flex-col gap-4 pb-28">
            <div className="sticky top-0 z-40 bg-surface-base/95 px-4 pt-3 backdrop-blur-sm">
                <BackButton onBack={requestBack} />
            </div>

            <div className="px-4">
                <h1 className="heading-5 text-text-primary">Editar rutina</h1>
                <p className="caption-5 text-text-muted">
                    Los cambios se guardan en tu dispositivo y se sincronizan cuando haya conexión.
                </p>
            </div>

            {dayIssue("days") && <Alert>{dayIssue("days")?.message}</Alert>}
            {editor.saveError && <Alert>{editor.saveError}</Alert>}

            <div className="flex gap-2 overflow-x-auto px-4 pb-1">
                {draft.map((day) => (
                    <button
                        key={day.id}
                        type="button"
                        aria-pressed={day.id === activeDay?.id}
                        onClick={() => actions.selectDay(day.id)}
                        className={`pressable button-sm flex min-h-12 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 ${
                            day.id === activeDay?.id
                                ? "border-accent bg-accent text-text-primary"
                                : "border-surface-border bg-surface-raised text-text-secondary hover:bg-surface-strong"
                        }`}
                    >
                        {weekdayLabel(day.dayName)}
                        <span className="caption-4 opacity-70">({day.exercises.length})</span>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setSheet("add-day")}
                    disabled={editor.freeWeekdays.length === 0}
                    className="btn-dashed button-sm shrink-0"
                    aria-label="Agregar día"
                >
                    <Plus size={16} weight="bold" /> Día
                </button>
            </div>

            {!activeDay ? (
                <EmptyRoutine onAddDay={() => setSheet("add-day")} />
            ) : (
                <div className="flex flex-col gap-3 px-4">
                    {activeDay.exercises.length === 0 && (
                        <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-6 text-center">
                            <h2 className="title-3 text-text-primary">Sin ejercicios</h2>
                            <p className={`body-6 mt-1 ${dayIssue("exercises") ? "text-danger-text" : "text-text-secondary"}`} role={dayIssue("exercises") ? "alert" : undefined}>
                                {dayIssue("exercises")?.message ?? "Agrega el primer ejercicio de este día."}
                            </p>
                        </div>
                    )}

                    {activeDay.exercises.map((exercise, index) => (
                        <ExerciseEditorCard
                            key={exercise.id}
                            exercise={exercise}
                            isFirst={index === 0}
                            isLast={index === activeDay.exercises.length - 1}
                            issues={issues.filter((i) => i.dayId === activeDay.id && i.exerciseId === exercise.id)}
                            onChange={(patch) => actions.updateExercise(activeDay.id, exercise.id, patch)}
                            onMove={(direction) => actions.moveExercise(activeDay.id, exercise.id, direction)}
                            onRemove={() => actions.removeExercise(activeDay.id, exercise.id)}
                        />
                    ))}

                    <button type="button" onClick={() => setSheet("add-exercise")} className="btn-dashed button-md">
                        <Plus size={20} weight="bold" /> Agregar ejercicio
                    </button>

                    <div className="mt-4 flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => setSheet("delete-day")}
                            disabled={isDayInProgress}
                            className="btn-secondary button-md text-danger-text"
                        >
                            <Trash size={20} weight="bold" /> Eliminar {weekdayLabel(activeDay.dayName)}
                        </button>
                        {isDayInProgress && (
                            <p className="caption-5 text-text-muted">
                                Hay un entrenamiento en curso en este día. Termínalo para poder eliminarlo.
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="fixed inset-x-0 bottom-0 z-30 bg-surface-base/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
                <button
                    type="button"
                    onClick={actions.save}
                    disabled={!editor.isDirty || editor.isSaving}
                    aria-busy={editor.isSaving}
                    className="btn-primary w-full button-md"
                >
                    {editor.isSaving ? "Guardando…" : "Guardar cambios"}
                </button>
            </div>

            {sheet === "add-day" && (
                <AddDaySheet
                    weekdays={editor.freeWeekdays}
                    onSelect={(dayName) => {
                        actions.addDay(dayName);
                        setSheet(null);
                    }}
                    onClose={() => setSheet(null)}
                />
            )}

            {sheet === "add-exercise" && activeDay && (
                <ExercisePicker
                    mode="add"
                    exclude={activeDay.exercises.flatMap((e) => (e.ref ? [e.ref] : []))}
                    onSelect={(exercise) => {
                        actions.addExercise(activeDay.id, exercise);
                        setSheet(null);
                    }}
                    onClose={() => setSheet(null)}
                />
            )}

            {sheet === "delete-day" && activeDay && (
                <ConfirmSheet
                    title={`¿Eliminar ${weekdayLabel(activeDay.dayName)}?`}
                    message="Se quita la rutina de este día con sus ejercicios. Tus entrenamientos anteriores no cambian. Se aplica cuando guardes."
                    confirmLabel="Eliminar día"
                    cancelLabel="Conservar día"
                    destructive
                    onConfirm={() => {
                        actions.removeDay(activeDay.id);
                        setSheet(null);
                    }}
                    onCancel={() => setSheet(null)}
                />
            )}

            {sheet === "discard" && (
                <ConfirmSheet
                    title="¿Descartar los cambios?"
                    message="Hay cambios sin guardar en tu rutina. Si sales ahora, se pierden."
                    confirmLabel="Descartar cambios"
                    cancelLabel="Seguir editando"
                    destructive
                    onConfirm={goBack}
                    onCancel={() => setSheet(null)}
                />
            )}
        </div>
    );
}
