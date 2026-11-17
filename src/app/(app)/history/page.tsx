/**
 * History Page — progress of one exercise (`/history?ref=<exercise key>`).
 *
 * Static shell: the exercise comes from the search param and the data from
 * the local database, so one cached document serves every exercise offline.
 */

import ExerciseHistoryView from "@/presentation/components/history/ExerciseHistoryView";

export default function HistoryPage() {
    return (
        <main className="min-h-dvh bg-surface-base">
            <ExerciseHistoryView />
        </main>
    );
}
