/**
 * Dashboard Page — Server Component entry point.
 *
 * Sticky header with UserProfile + DashboardClient.
 * Authentication handled by middleware and server actions.
 */

import DashboardClient from "@/presentation/components/dashboard/DashboardClient";
import UserProfile from "@/presentation/components/dashboard/UserProfile";
import SyncBadge from "@/presentation/components/sync/SyncBadge";

export default function DashboardPage() {
    return (
        <main className="min-h-screen bg-zinc-950">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/50">
                <div className="flex items-center justify-between px-4 py-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">J-GYM</h1>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Sobrecarga Progresiva
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <SyncBadge />
                        <UserProfile />
                    </div>
                </div>
            </div>

            {/* Dashboard Client */}
            <DashboardClient />
        </main>
    );
}
