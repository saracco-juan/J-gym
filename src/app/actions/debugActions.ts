"use server";

/**
 * Debug Server Actions — Herramientas de desarrollo.
 *
 * REGLA: userId se obtiene del servidor via supabase.auth.getUser().
 */

import { createSupabaseServerClient } from "@/infrastructure/auth/serverClient";

interface ActionResult {
    success: boolean;
    error?: string;
}

/**
 * Borra TODOS los datos del usuario (routine_templates + workout_logs).
 * El usuario queda como si fuera nuevo → redirect a /onboarding.
 */
export async function resetUserAppData(): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: "No estás autenticado." };
        }

        // Delete workout logs first (FK reference)
        const { error: logsError } = await supabase
            .from("workout_logs")
            .delete()
            .eq("user_id", user.id);

        if (logsError) {
            console.error("[resetUserAppData] workout_logs:", logsError);
            return { success: false, error: "Error al borrar los registros de entrenamiento." };
        }

        // Delete routine templates
        const { error: templatesError } = await supabase
            .from("routine_templates")
            .delete()
            .eq("user_id", user.id);

        if (templatesError) {
            console.error("[resetUserAppData] routine_templates:", templatesError);
            return { success: false, error: "Error al borrar las plantillas de rutina." };
        }

        return { success: true };
    } catch (error) {
        console.error("[resetUserAppData] Error inesperado:", error);
        return { success: false, error: "Error inesperado al resetear la app." };
    }
}
