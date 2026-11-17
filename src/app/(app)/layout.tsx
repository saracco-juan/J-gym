/**
 * Authenticated area layout. Mounts the sync engine once for dashboard,
 * onboarding and workout, so local writes are flushed from any of them, and
 * warms the offline cache of the app shell.
 */

import AppShellWarmup from "@/presentation/providers/AppShellWarmup";
import SyncProvider from "@/presentation/providers/SyncProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <SyncProvider>
            <AppShellWarmup />
            {children}
        </SyncProvider>
    );
}
