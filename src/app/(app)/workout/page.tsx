/**
 * Workout Page — Vista de entrenamiento activo.
 *
 * Renderiza el ActiveWorkoutView que consume el Zustand store.
 */

import ActiveWorkoutView from "@/presentation/components/workout/ActiveWorkoutView";

export default function WorkoutPage() {
    return (
        <main className="min-h-screen bg-zinc-950">
            <ActiveWorkoutView />
        </main>
    );
}
