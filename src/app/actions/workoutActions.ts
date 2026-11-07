"use server";

/**
 * Workout Server Actions — Orquestador de persistencia.
 *
 * REGLA: Cero lógica de negocio. Solo recibe resultados finales.
 * REGLA: userId se obtiene del servidor via supabase.auth.getUser().
 * REGLA: Repositorios reciben el cliente SSR autenticado.
 *
 * Incluye detección de PRs (no bloquea el guardado si falla).
 */

import type { IWorkoutLog } from "@/core/domain/workout-log";
import type { IRoutineExercise } from "@/core/domain/routine-template";
import { detectPersonalRecords } from "@/core/use-cases/detect-personal-records";
import { WorkoutLogRepository } from "@/infrastructure/database/WorkoutLogRepository";
import { RoutineRepository } from "@/infrastructure/database/RoutineRepository";
import { RepositoryError } from "@/infrastructure/database/RoutineRepository";
import { createSupabaseServerClient } from "@/infrastructure/auth/serverClient";

// ─── Tipos ─────────────────────────────────────────────────────────

export interface WorkoutActionResult {
    success: boolean;
    error?: string;
    /** Nombres de ejercicios que lograron un nuevo PR en esta sesión. */
    newPRs?: string[];
}

// ─── Server Action ─────────────────────────────────────────────────

export async function finalizeWorkoutSession(
    workoutLog: IWorkoutLog,
    updatedExercises?: IRoutineExercise[]
): Promise<WorkoutActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: "No estás autenticado." };
        }

        const secureLog: IWorkoutLog = { ...workoutLog, userId: user.id };
        const workoutLogRepo = new WorkoutLogRepository(supabase);
        const routineRepo = new RoutineRepository(supabase);

        // 1. Obtener PRs anteriores (no bloquea si falla)
        const exerciseNames = secureLog.exercises.map((e) => e.exercise.name);
        let previousPRs = new Map<string, number>();
        try {
            previousPRs = await workoutLogRepo.getPersonalBests(user.id, exerciseNames);
        } catch {
            // Silenciado — no impide guardar
        }

        // 2. Guardar el registro
        await workoutLogRepo.saveWorkoutLog(secureLog);

        // 3. Actualizar template si hubo sobrecarga
        if (updatedExercises && updatedExercises.length > 0) {
            await routineRepo.updateTemplateAfterOverload(
                secureLog.templateId,
                updatedExercises
            );
        }

        // 4. Detectar nuevos PRs
        const newPRs = detectPersonalRecords(secureLog.exercises, previousPRs);

        return { success: true, newPRs: newPRs.length > 0 ? newPRs : undefined };
    } catch (error) {
        if (error instanceof RepositoryError) {
            console.error(`[finalizeWorkoutSession] ${error.operation}:`, error.cause);
            return { success: false, error: error.message };
        }
        console.error("[finalizeWorkoutSession] Error inesperado:", error);
        return {
            success: false,
            error: "Ocurrió un error inesperado al guardar el entrenamiento. Intentá de nuevo.",
        };
    }
}

// ─── Server Action: Fetch PRs ──────────────────────────────────────

/**
 * Obtiene los PRs actuales de una lista de ejercicios.
 * Usado por el UI de entrenamiento activo para mostrar badges.
 */
export async function fetchExercisePRs(
    exerciseNames: string[]
): Promise<Record<string, number>> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) return {};

        const workoutLogRepo = new WorkoutLogRepository(supabase);
        const prs = await workoutLogRepo.getPersonalBests(user.id, exerciseNames);

        return Object.fromEntries(prs);
    } catch {
        return {};
    }
}
