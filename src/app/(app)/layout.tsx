/**
 * Authenticated area layout. Mounts the sync engine once for dashboard,
 * onboarding and workout, so local writes are flushed from any of them.
 */

import SyncProvider from "@/presentation/providers/SyncProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <SyncProvider>{children}</SyncProvider>;
}
