"use server";

/**
 * Notification Server Actions — Lógica de notificaciones programadas.
 *
 * processDailyNotifications() está diseñada para ser invocada
 * por un Cron Job (Edge Function de Supabase, Vercel Cron, etc.).
 *
 * Lógica:
 * - Día de descanso → frase motivacional
 * - Día de entrenamiento no completado → recordatorio
 * - Día de entrenamiento completado → felicitación
 */

import { createSupabaseServerClient } from "@/infrastructure/auth/serverClient";
import { getDailyQuote } from "@/core/constants/quotes";

// ─── Tipos ─────────────────────────────────────────────────────────

interface NotificationPayload {
    userId: string;
    title: string;
    body: string;
    type: "motivation" | "reminder" | "congratulation";
}

interface ProcessResult {
    success: boolean;
    processed: number;
    notifications: NotificationPayload[];
    error?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

function getTodayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getDayOfWeekName(): string {
    const names = [
        "domingo", "lunes", "martes", "miércoles",
        "jueves", "viernes", "sábado",
    ];
    return names[new Date().getDay()];
}

// ─── Main function ─────────────────────────────────────────────────

/**
 * Procesa todas las notificaciones diarias.
 *
 * Pensada para ejecutarse en un Cron Job:
 * - 08:00 → motivación/recordatorio
 * - 13:00 → recordatorio si no completó
 * - 20:00 → última llamada o felicitación
 */
export async function processDailyNotifications(): Promise<ProcessResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const today = getTodayStr();
        const dayName = getDayOfWeekName();

        // 1. Obtener todos los templates de hoy (agrupados por user_id)
        const { data: templates, error: tmplError } = await supabase
            .from("routine_templates")
            .select("user_id, day_of_week")
            .eq("day_of_week", dayName);

        if (tmplError) {
            return { success: false, processed: 0, notifications: [], error: tmplError.message };
        }

        // User IDs con entrenamiento hoy
        const usersWithTraining = new Set(
            (templates ?? []).map((t: { user_id: string }) => t.user_id)
        );

        // 2. Ver quién ya completó hoy
        const { data: logs, error: logError } = await supabase
            .from("workout_logs")
            .select("user_id")
            .eq("date", today);

        if (logError) {
            return { success: false, processed: 0, notifications: [], error: logError.message };
        }

        const usersCompleted = new Set(
            (logs ?? []).map((l: { user_id: string }) => l.user_id)
        );

        // 3. Construir notificaciones
        const notifications: NotificationPayload[] = [];
        const quote = getDailyQuote(new Date());
        const currentHour = new Date().getHours();

        // Para cada usuario con entrenamiento hoy
        for (const userId of usersWithTraining) {
            const completed = usersCompleted.has(userId);

            if (completed) {
                notifications.push({
                    userId,
                    title: "Objetivo cumplido",
                    body: "Buen trabajo. Tu sesion de hoy esta completada.",
                    type: "congratulation",
                });
            } else if (currentHour >= 20) {
                notifications.push({
                    userId,
                    title: "Ultima llamada",
                    body: "Entrenar te va a hacer sentir mejor. Tu sesion te espera.",
                    type: "reminder",
                });
            } else if (currentHour >= 13) {
                notifications.push({
                    userId,
                    title: "A entrenar",
                    body: "Tenes tu sesion pendiente. No dejes que el dia se te escape.",
                    type: "reminder",
                });
            } else {
                notifications.push({
                    userId,
                    title: "Hoy es dia de gimnasio",
                    body: `"${quote}"`,
                    type: "motivation",
                });
            }
        }

        // Usuarios SIN entrenamiento hoy → frase motivacional
        // (Esto requeriría listar todos los usuarios activos,
        // lo cual es más complejo. Por ahora solo notificamos
        // a los que tienen rutina asignada hoy.)

        return {
            success: true,
            processed: notifications.length,
            notifications,
        };
    } catch (error) {
        console.error("[processDailyNotifications] Error:", error);
        return {
            success: false,
            processed: 0,
            notifications: [],
            error: "Error inesperado al procesar notificaciones.",
        };
    }
}
