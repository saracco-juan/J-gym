/**
 * The achievements of the leaderboard card: ids, Spanish titles and one line
 * descriptions. Pure data. Their rules live in `achievements.ts`.
 */

export type AchievementId =
    | "first-full-week"
    | "ten-workouts"
    | "four-weeks-no-miss"
    | "plateau-breaker";

export interface AchievementDefinition {
    id: AchievementId;
    title: string;
    description: string;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
    {
        id: "first-full-week",
        title: "Primera semana completa",
        description: "Entrenaste todos los días de tu rutina en una misma semana.",
    },
    {
        id: "ten-workouts",
        title: "Diez entrenamientos",
        description: "Registraste diez entrenamientos.",
    },
    {
        id: "four-weeks-no-miss",
        title: "Cuatro semanas sin faltar",
        description: "Completaste cuatro semanas seguidas sin saltear ningún día de tu rutina.",
    },
    {
        id: "plateau-breaker",
        title: "Rompiste el estancamiento",
        description: "Superaste tu mejor peso en un ejercicio en el que te habías estancado.",
    },
];

export const ACHIEVEMENT_IDS: readonly AchievementId[] = ACHIEVEMENTS.map((a) => a.id);

export function isAchievementId(value: unknown): value is AchievementId {
    return typeof value === "string" && (ACHIEVEMENT_IDS as readonly string[]).includes(value);
}
