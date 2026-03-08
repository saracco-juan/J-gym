/**
 * RoutineRepository — Acceso a datos de RoutineTemplate en Supabase.
 *
 * Schema: routine_templates tiene una columna JSONB `exercises`
 * que contiene el array completo de ejercicios con sus sets.
 *
 * REGLA: Cero lógica de negocio. Solo lectura/escritura + mapeo DB ↔ dominio.
 * REGLA: Recibe un cliente Supabase autenticado (SSR) via constructor.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
    IRoutineTemplate,
    IRoutineExercise,
} from "@/core/domain/routine-template";
import type { ISetPlan } from "@/core/domain/exercises";

// ─── Tipos de la DB (filas de Supabase) ────────────────────────────

interface RoutineTemplateRow {
    id: string;
    user_id: string;
    day_name: string;
    exercises: ExerciseJsonRow[];
}

interface ExerciseJsonRow {
    exercise_id: string;
    exercise_name: string;
    sets: SetPlanRow[];
}

interface SetPlanRow {
    set_number: number;
    target_reps: number;
    target_weight: number;
}

// ─── Error personalizado ───────────────────────────────────────────

export class RepositoryError extends Error {
    constructor(
        message: string,
        public readonly operation: string,
        public readonly cause?: unknown
    ) {
        super(message);
        this.name = "RepositoryError";
    }
}

// ─── Mappers DB → Dominio ──────────────────────────────────────────

function mapSetPlanRow(row: SetPlanRow): ISetPlan {
    return {
        setNumber: row.set_number,
        targetReps: row.target_reps,
        targetWeight: row.target_weight,
    };
}

function mapExerciseJsonRow(row: ExerciseJsonRow): IRoutineExercise {
    return {
        exercise: { id: row.exercise_id, name: row.exercise_name },
        sets: row.sets.map(mapSetPlanRow),
    };
}

function mapTemplateRowToDomain(row: RoutineTemplateRow): IRoutineTemplate {
    return {
        id: row.id,
        userId: row.user_id,
        dayName: row.day_name,
        exercises: (row.exercises ?? []).map(mapExerciseJsonRow),
    };
}

// ─── Mappers Dominio → DB ──────────────────────────────────────────

function mapSetPlanToDB(set: ISetPlan): SetPlanRow {
    return {
        set_number: set.setNumber,
        target_reps: set.targetReps,
        target_weight: set.targetWeight,
    };
}

function mapExerciseToDB(re: IRoutineExercise): ExerciseJsonRow {
    return {
        exercise_id: re.exercise.id,
        exercise_name: re.exercise.name,
        sets: re.sets.map(mapSetPlanToDB),
    };
}

// ─── Repositorio ───────────────────────────────────────────────────

export class RoutineRepository {
    constructor(private readonly supabase: SupabaseClient) { }

    async getTodayTemplate(
        userId: string,
        date: Date
    ): Promise<IRoutineTemplate | null> {
        const dayNames = [
            "domingo", "lunes", "martes", "miércoles",
            "jueves", "viernes", "sábado",
        ];
        const dayName = dayNames[date.getDay()];

        try {
            const { data, error } = await this.supabase
                .from("routine_templates")
                .select("id, user_id, day_name, exercises")
                .eq("user_id", userId)
                .eq("day_name", dayName)
                .maybeSingle();

            if (error) {
                throw new RepositoryError(
                    `Error al obtener el template para ${dayName}.`,
                    "getTodayTemplate", error
                );
            }

            if (!data) return null;
            return mapTemplateRowToDomain(data as RoutineTemplateRow);
        } catch (error) {
            if (error instanceof RepositoryError) throw error;
            throw new RepositoryError(
                "Error inesperado al consultar el template.",
                "getTodayTemplate", error
            );
        }
    }

    async updateTemplateAfterOverload(
        templateId: string,
        updatedExercises: IRoutineExercise[]
    ): Promise<void> {
        try {
            const exercisesJson = updatedExercises.map(mapExerciseToDB);

            const { error } = await this.supabase
                .from("routine_templates")
                .update({ exercises: exercisesJson })
                .eq("id", templateId);

            if (error) {
                throw new RepositoryError(
                    "Error al actualizar los ejercicios del template.",
                    "updateTemplateAfterOverload", error
                );
            }
        } catch (error) {
            if (error instanceof RepositoryError) throw error;
            throw new RepositoryError(
                "Error inesperado al actualizar el template.",
                "updateTemplateAfterOverload", error
            );
        }
    }

    async hasAnyTemplates(userId: string): Promise<boolean> {
        try {
            const { count, error } = await this.supabase
                .from("routine_templates")
                .select("id", { count: "exact", head: true })
                .eq("user_id", userId);

            if (error) {
                throw new RepositoryError(
                    "Error al verificar templates existentes.",
                    "hasAnyTemplates", error
                );
            }

            return (count ?? 0) > 0;
        } catch (error) {
            if (error instanceof RepositoryError) throw error;
            throw new RepositoryError(
                "Error inesperado al verificar templates.",
                "hasAnyTemplates", error
            );
        }
    }

    async createTemplates(
        userId: string,
        templates: { dayName: string; exercises: IRoutineExercise[] }[]
    ): Promise<void> {
        try {
            const rows = templates.map((tmpl) => ({
                user_id: userId,
                day_name: tmpl.dayName,
                exercises: tmpl.exercises.map(mapExerciseToDB),
            }));

            const { error } = await this.supabase
                .from("routine_templates")
                .insert(rows);

            if (error) {
                throw new RepositoryError(
                    "Error al crear los templates de rutina.",
                    "createTemplates", error
                );
            }
        } catch (error) {
            if (error instanceof RepositoryError) throw error;
            throw new RepositoryError(
                "Error inesperado al crear los templates.",
                "createTemplates", error
            );
        }
    }
}
