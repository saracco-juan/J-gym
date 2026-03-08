/**
 * WorkoutLogRepository — Acceso a datos de WorkoutLog en Supabase.
 *
 * Responsabilidad única: persistir el registro inmutable de una sesión
 * de entrenamiento finalizada y consultar registros por fecha.
 *
 * REGLA: Cero lógica de negocio. Solo escritura + mapeo dominio → DB.
 * REGLA: Recibe un cliente Supabase autenticado (SSR) via constructor.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { IWorkoutLog, IWorkoutExercise } from "@/core/domain/workout-log";
import { RepositoryError } from "./RoutineRepository";

// ─── Tipos de la DB (filas de Supabase) ────────────────────────────

interface WorkoutLogInsert {
    id: string;
    user_id: string;
    template_id: string;
    date: string;
    exercises: WorkoutExerciseRow[];
    completed_at: string | null;
}

interface WorkoutExerciseRow {
    exercise_id: string;
    exercise_name: string;
    sets: WorkoutSetRow[];
}

interface WorkoutSetRow {
    set_number: number;
    actual_reps: number;
    actual_weight: number;
}

// ─── Mappers Dominio → DB ──────────────────────────────────────────

function mapWorkoutExerciseToDB(exercise: IWorkoutExercise): WorkoutExerciseRow {
    return {
        exercise_id: exercise.exercise.id,
        exercise_name: exercise.exercise.name,
        sets: exercise.sets.map((set) => ({
            set_number: set.setNumber,
            actual_reps: set.actualReps,
            actual_weight: set.actualWeight,
        })),
    };
}

function mapWorkoutLogToDB(log: IWorkoutLog): WorkoutLogInsert {
    return {
        id: log.id,
        user_id: log.userId,
        template_id: log.templateId,
        date: log.date,
        exercises: log.exercises.map(mapWorkoutExerciseToDB),
        completed_at: log.completedAt,
    };
}

// ─── Repositorio ───────────────────────────────────────────────────

export class WorkoutLogRepository {
    constructor(private readonly supabase: SupabaseClient) { }

    async saveWorkoutLog(log: IWorkoutLog): Promise<void> {
        try {
            const row = mapWorkoutLogToDB(log);

            const { error } = await this.supabase
                .from("workout_logs")
                .insert(row);

            if (error) {
                throw new RepositoryError(
                    "Error al guardar el registro de entrenamiento.",
                    "saveWorkoutLog", error
                );
            }
        } catch (error) {
            if (error instanceof RepositoryError) throw error;
            throw new RepositoryError(
                "Error inesperado al guardar el workout log.",
                "saveWorkoutLog", error
            );
        }
    }

    async getLogByDate(
        userId: string,
        date: string
    ): Promise<IWorkoutLog | null> {
        try {
            const { data, error } = await this.supabase
                .from("workout_logs")
                .select("id, user_id, template_id, date, exercises, completed_at")
                .eq("user_id", userId)
                .eq("date", date)
                .maybeSingle();

            if (error) {
                throw new RepositoryError(
                    "Error al obtener el registro de entrenamiento.",
                    "getLogByDate", error
                );
            }

            if (!data) return null;

            const row = data as {
                id: string;
                user_id: string;
                template_id: string;
                date: string;
                exercises: WorkoutExerciseRow[];
                completed_at: string | null;
            };

            return {
                id: row.id,
                userId: row.user_id,
                templateId: row.template_id,
                date: row.date,
                exercises: row.exercises.map((ex) => ({
                    exercise: { id: ex.exercise_id, name: ex.exercise_name },
                    sets: ex.sets.map((s) => ({
                        setNumber: s.set_number,
                        actualReps: s.actual_reps,
                        actualWeight: s.actual_weight,
                    })),
                })),
                completedAt: row.completed_at,
            };
        } catch (error) {
            if (error instanceof RepositoryError) throw error;
            throw new RepositoryError(
                "Error inesperado al consultar el workout log.",
                "getLogByDate", error
            );
        }
    }

    /**
     * Obtiene el récord personal (peso máximo) de un ejercicio.
     *
     * Busca en todos los workout_logs del usuario el max actual_weight
     * para ese exercise_name. Retorna 0 si no hay datos.
     *
     * No lanza errores — si falla, retorna 0 silenciosamente.
     */
    async getPersonalBest(
        userId: string,
        exerciseName: string
    ): Promise<number> {
        try {
            const { data, error } = await this.supabase
                .from("workout_logs")
                .select("exercises")
                .eq("user_id", userId);

            if (error || !data) return 0;

            let maxWeight = 0;

            for (const row of data) {
                const exercises = row.exercises as WorkoutExerciseRow[] | null;
                if (!exercises) continue;

                for (const ex of exercises) {
                    if (ex.exercise_name !== exerciseName) continue;
                    for (const set of ex.sets) {
                        if (set.actual_weight > maxWeight) {
                            maxWeight = set.actual_weight;
                        }
                    }
                }
            }

            return maxWeight;
        } catch {
            console.error("[getPersonalBest] Error silenciado para", exerciseName);
            return 0;
        }
    }

    /**
     * Obtiene los PRs de múltiples ejercicios en una sola query.
     * Retorna un Map<exerciseName, maxWeight>.
     */
    async getPersonalBests(
        userId: string,
        exerciseNames: string[]
    ): Promise<Map<string, number>> {
        const prs = new Map<string, number>();
        if (exerciseNames.length === 0) return prs;

        try {
            const { data, error } = await this.supabase
                .from("workout_logs")
                .select("exercises")
                .eq("user_id", userId);

            if (error || !data) return prs;

            for (const row of data) {
                const exercises = row.exercises as WorkoutExerciseRow[] | null;
                if (!exercises) continue;

                for (const ex of exercises) {
                    if (!exerciseNames.includes(ex.exercise_name)) continue;
                    for (const set of ex.sets) {
                        const current = prs.get(ex.exercise_name) ?? 0;
                        if (set.actual_weight > current) {
                            prs.set(ex.exercise_name, set.actual_weight);
                        }
                    }
                }
            }

            return prs;
        } catch {
            console.error("[getPersonalBests] Error silenciado");
            return prs;
        }
    }
}
