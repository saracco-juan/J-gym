/**
 * Dashboard Page — Server Component entry point.
 *
 * Sticky header with UserProfile + DashboardClient.
 * Authentication is handled by the proxy; data comes from the local database.
 */

import DashboardClient from "@/presentation/components/dashboard/DashboardClient";
import LeaderboardLink from "@/presentation/components/dashboard/LeaderboardLink";
import UserProfile from "@/presentation/components/dashboard/UserProfile";
import SyncBadge from "@/presentation/components/sync/SyncBadge";

export default function DashboardPage() {
    return (
        <main className="min-h-dvh bg-surface-base">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-surface-base/95 backdrop-blur-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div>
                        <h1 className="heading-5 text-text-primary">J-GYM</h1>
                        <p className="caption-5 text-text-muted">
                            Sobrecarga progresiva
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <SyncBadge />
                        <LeaderboardLink />
                        <UserProfile />
                    </div>
                </div>
            </div>

            {/* Dashboard Client */}
            <DashboardClient />
        </main>
    );
}
