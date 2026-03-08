"use server";

/**
 * Onboarding Server Actions — Persistencia de la configuración inicial.
 *
 * REGLA: userId se obtiene del servidor via supabase.auth.getUser().
 * REGLA: Repositorios reciben el cliente SSR autenticado.
 */

import type { IRoutineExercise } from "@/core/domain/routine-template";
import { RoutineRepository } from "@/infrastructure/database/RoutineRepository";
import { RepositoryError } from "@/infrastructure/database/RoutineRepository";
import { createSupabaseServerClient } from "@/infrastructure/auth/serverClient";

interface ActionResult {
    success: boolean;
    error?: string;
}

export interface OnboardingTemplate {
    dayName: string;
    exercises: IRoutineExercise[];
}

export async function saveWeeklyRoutine(
    templates: OnboardingTemplate[]
): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: "No estás autenticado." };
        }

        const routineRepo = new RoutineRepository(supabase);
        await routineRepo.createTemplates(user.id, templates);

        return { success: true };
    } catch (error) {
        if (error instanceof RepositoryError) {
            console.error(`[saveWeeklyRoutine] ${error.operation}:`, error.cause);
            return { success: false, error: error.message };
        }
        console.error("[saveWeeklyRoutine] Error inesperado:", error);
        return {
            success: false,
            error: "Error al guardar la rutina. Intentá de nuevo.",
        };
    }
}
