"use client";

/**
 * StatsPublisher: keeps the public stats snapshot from going stale. Once the
 * user is known to be registered with a profile, it publishes on app start
 * when the stored snapshot is older than today, and again whenever the page
 * becomes visible (an installed app can stay open across midnight).
 * Renders nothing.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/presentation/stores/useAuthStore";
import { useProfileStore } from "@/presentation/stores/useProfileStore";
import { useSyncStore } from "@/presentation/stores/useSyncStore";
import { requestStatsPublish } from "./requestStatsPublish";

export default function StatsPublisher() {
    const userId = useSyncStore((s) => s.userId);
    const isRegistered = useAuthStore((s) => (s.user ? !s.user.isAnonymous : false));
    const hasProfile = useProfileStore((s) => s.profile != null);

    useEffect(() => {
        if (!userId || !isRegistered || !hasProfile) return;
        void requestStatsPublish({ onlyIfStale: true });
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                void requestStatsPublish({ onlyIfStale: true });
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [userId, isRegistered, hasProfile]);

    return null;
}
