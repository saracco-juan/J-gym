"use client";

/**
 * LeaderboardView: entry of the /leaderboard screen. Anonymous accounts and
 * users without a profile cannot appear on the table (the server refuses
 * them), so they get a prompt to link an email or create a profile instead.
 * Everyone else sees the board.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { decideProfileGate } from "@/core/profile";
import BackButton from "@/presentation/components/ui/BackButton";
import { useAuthStore } from "@/presentation/stores/useAuthStore";
import { useProfileStore } from "@/presentation/stores/useProfileStore";
import LeaderboardBoard from "./LeaderboardBoard";
import { LeaderboardPrompt } from "./LeaderboardMessages";
import LeaderboardSkeleton from "./LeaderboardSkeleton";

export default function LeaderboardView() {
    const router = useRouter();
    const authUser = useAuthStore((s) => s.user);
    const profile = useProfileStore((s) => s.profile);

    // Signed out (the proxy normally catches this first).
    useEffect(() => {
        if (authUser === null) router.replace("/login");
    }, [authUser, router]);

    const gate =
        authUser && profile !== undefined
            ? decideProfileGate({ isAnonymous: authUser.isAnonymous, hasProfile: profile !== null })
            : null;

    return (
        <div className="flex flex-col gap-4 px-4 py-4">
            <div className="flex flex-col gap-2">
                <BackButton />
                <h1 className="heading-5 text-text-primary">Tabla del gym</h1>
                <p className="body-6 text-text-secondary">
                    Rachas, volumen y progreso de todos los que entrenan acá.
                </p>
            </div>

            {gate === null ? (
                <LeaderboardSkeleton />
            ) : gate === "ready" && authUser ? (
                <LeaderboardBoard userId={authUser.id} />
            ) : (
                <LeaderboardPrompt reason={gate === "link-email" ? "link-email" : "setup-profile"} />
            )}
        </div>
    );
}
