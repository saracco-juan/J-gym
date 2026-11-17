/**
 * Routine Page — edit the weekly routine after onboarding.
 *
 * Authentication is handled by the proxy; data comes from the local database.
 */

import RoutineEditor from "@/presentation/components/routine/RoutineEditor";

export default function RoutinePage() {
    return (
        <main className="min-h-dvh bg-surface-base">
            <RoutineEditor />
        </main>
    );
}
