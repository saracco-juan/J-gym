"use client";

/**
 * useRoutineEditor — state of the routine editor screen.
 *
 * Loads the stored routines from the local database, keeps the edited draft,
 * and saves through the local repositories (which enqueue the sync). The
 * rules themselves (operations, validation, save plan) are pure, in core.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    addDay,
    addExercise,
    availableWeekdays,
    draftFromTemplates,
    moveExercise,
    planRoutineSave,
    removeDay,
    removeExercise,
    updateExercise,
    validateDraft,
    type DraftDay,
    type DraftIssue,
} from "@/core/routine";
import type { ExerciseDescriptor } from "@/core/session";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import {
    loadRoutineEditor,
    saveRoutineEdits,
    type RoutineEditorData,
} from "@/infrastructure/local/queries";
import { requestStatsPublish } from "@/presentation/stats/requestStatsPublish";
import { useSyncStore } from "@/presentation/stores/useSyncStore";

export function useRoutineEditor() {
    const router = useRouter();
    const userId = useSyncStore((s) => s.userId);
    const [stored, setStored] = useState<RoutineEditorData | null>(null);
    const [draft, setDraft] = useState<DraftDay[]>([]);
    const [activeDayId, setActiveDayId] = useState<string | null>(null);
    const [attempted, setAttempted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (userId === undefined) return;
        if (userId === null) {
            router.replace("/login");
            return;
        }
        let cancelled = false;
        loadRoutineEditor(getLocalRepositories(), userId)
            .then((data) => {
                if (cancelled) return;
                const initial = draftFromTemplates(data.templates);
                setStored(data);
                setDraft(initial);
                setActiveDayId(initial[0]?.id ?? null);
            })
            .catch(() => {
                if (!cancelled) setLoadError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [router, userId]);

    const initialJson = useMemo(
        () => (stored ? JSON.stringify(draftFromTemplates(stored.templates)) : ""),
        [stored]
    );
    const isDirty = stored !== null && JSON.stringify(draft) !== initialJson;
    const allIssues = useMemo(() => validateDraft(draft), [draft]);
    // Typed values are checked as they are edited; missing days or exercises
    // only after the user tried to save.
    const issues: DraftIssue[] = allIssues.filter(
        (i) => attempted || i.field === "sets" || i.field === "reps" || i.field === "weight"
    );

    const activeDay = draft.find((d) => d.id === activeDayId) ?? draft[0] ?? null;

    const edit = useCallback((change: (days: DraftDay[]) => DraftDay[]) => {
        setSaveError(null);
        setDraft(change);
    }, []);

    const actions = {
        selectDay: setActiveDayId,
        addDay: (dayName: string) => {
            const id = crypto.randomUUID();
            edit((days) => addDay(days, dayName, id));
            setActiveDayId(id);
        },
        removeDay: (dayId: string) => {
            edit((days) => removeDay(days, dayId));
            setActiveDayId(null);
        },
        addExercise: (dayId: string, exercise: ExerciseDescriptor) =>
            edit((days) => addExercise(days, dayId, exercise, crypto.randomUUID())),
        removeExercise: (dayId: string, exerciseId: string) =>
            edit((days) => removeExercise(days, dayId, exerciseId)),
        moveExercise: (dayId: string, exerciseId: string, direction: "up" | "down") =>
            edit((days) => moveExercise(days, dayId, exerciseId, direction)),
        updateExercise: (
            dayId: string,
            exerciseId: string,
            patch: Parameters<typeof updateExercise>[3]
        ) => edit((days) => updateExercise(days, dayId, exerciseId, patch)),
        save: async () => {
            if (!stored || !userId) return;
            if (allIssues.length > 0) {
                setAttempted(true);
                const firstDay = allIssues.find((i) => i.dayId !== "")?.dayId;
                if (firstDay) setActiveDayId(firstDay);
                return;
            }
            setIsSaving(true);
            setSaveError(null);
            try {
                const plan = planRoutineSave({ userId, original: stored.templates, draft });
                await saveRoutineEdits(getLocalRepositories(), plan);
                // The schedule changed, so the streak may too.
                void requestStatsPublish();
                router.push("/dashboard");
            } catch {
                setSaveError("No se pudo guardar la rutina en el dispositivo. Intenta de nuevo.");
                setIsSaving(false);
            }
        },
    };

    return {
        isLoading: !stored && !loadError,
        loadError,
        saveError,
        isSaving,
        isDirty,
        attempted,
        draft,
        activeDay,
        activeTemplateId: stored?.activeTemplateId ?? null,
        freeWeekdays: availableWeekdays(draft),
        issues,
        actions,
    };
}
