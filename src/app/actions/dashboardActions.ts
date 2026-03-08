"use server";

/**
 * Dashboard Server Actions — Obtención de datos para la vista principal.
 *
 * REGLA: El userId se obtiene del servidor via supabase.auth.getUser().
 * REGLA: Los repositorios reciben el cliente SSR autenticado (no el anónimo).
 */

import type { IRoutineTemplate } from "@/core/domain/routine-template";
import type { IWorkoutLog } from "@/core/domain/workout-log";
import { RoutineRepository } from "@/infrastructure/database/RoutineRepository";
import { WorkoutLogRepository } from "@/infrastructure/database/WorkoutLogRepository";
import { RepositoryError } from "@/infrastructure/database/RoutineRepository";
import { createSupabaseServerClient } from "@/infrastructure/auth/serverClient";

// ─── Tipos de respuesta ────────────────────────────────────────────

interface DayDataTemplate { type: "template"; data: IRoutineTemplate; }
interface DayDataLog { type: "log"; data: IWorkoutLog; }
interface DayDataEmpty { type: "empty"; data: null; }
interface DayDataError { type: "error"; error: string; }

export type DayDataResult =
    | DayDataTemplate | DayDataLog | DayDataEmpty | DayDataError;

// ─── Helpers ───────────────────────────────────────────────────────

function isDateInPast(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr + "T00:00:00") < today;
}

// ─── Server Actions ────────────────────────────────────────────────

export async function checkHasRoutines(): Promise<{
    hasRoutines: boolean;
    error?: string;
}> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { hasRoutines: false, error: "No estás autenticado." };
        }

        const routineRepo = new RoutineRepository(supabase);
        const has = await routineRepo.hasAnyTemplates(user.id);
        return { hasRoutines: has };
    } catch (error) {
        if (error instanceof RepositoryError) {
            console.error(`[checkHasRoutines] ${error.operation}:`, error.cause);
            return { hasRoutines: false, error: error.message };
        }
        console.error("[checkHasRoutines] Error inesperado:", error);
        return { hasRoutines: false, error: "Error al verificar rutinas." };
    }
}

export async function fetchDayData(dateStr: string): Promise<DayDataResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { type: "error", error: "No estás autenticado." };
        }

        const userId = user.id;

        if (isDateInPast(dateStr)) {
            const workoutLogRepo = new WorkoutLogRepository(supabase);
            const log = await workoutLogRepo.getLogByDate(userId, dateStr);
            if (!log) return { type: "empty", data: null };
            return { type: "log", data: log };
        } else {
            const routineRepo = new RoutineRepository(supabase);
            const date = new Date(dateStr + "T00:00:00");
            const template = await routineRepo.getTodayTemplate(userId, date);
            if (!template) return { type: "empty", data: null };
            return { type: "template", data: template };
        }
    } catch (error) {
        if (error instanceof RepositoryError) {
            console.error(`[fetchDayData] ${error.operation}:`, error.cause);
            return { type: "error", error: error.message };
        }
        console.error("[fetchDayData] Error inesperado:", error);
        return { type: "error", error: "Error al cargar los datos del día." };
    }
}
