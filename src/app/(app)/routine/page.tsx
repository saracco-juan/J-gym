/**
 * Routine Page — edit the weekly routine after onboarding, and swap days of
 * the current week.
 *
 * Authentication is handled by the proxy; data comes from the local database.
 */

import RoutineEditor from "@/presentation/components/routine/RoutineEditor";
import WeekSwapPanel from "@/presentation/components/routine/WeekSwapPanel";

export default function RoutinePage() {
    return (
        <main className="min-h-dvh bg-surface-base">
            <RoutineEditor />
            {/* Below the editor; keeps room for the editor's fixed save bar. */}
            <div className="pb-28">
                <WeekSwapPanel />
            </div>
        </main>
    );
}
