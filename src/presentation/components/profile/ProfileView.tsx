"use client";

/**
 * ProfileView: entry of the /profile screen. Waits for the local data, then
 * shows the email linking flow to anonymous accounts (they cannot have a
 * profile) or the profile form to everyone else.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { shouldOfferEmailLink } from "@/core/auth";
import BackButton from "@/presentation/components/ui/BackButton";
import LinkEmailFlow from "@/presentation/components/auth/LinkEmailFlow";
import { useAuthStore } from "@/presentation/stores/useAuthStore";
import { useProfileStore } from "@/presentation/stores/useProfileStore";
import ProfileForm from "./ProfileForm";
import ProfileSkeleton from "./ProfileSkeleton";

export default function ProfileView() {
    const router = useRouter();
    const authUser = useAuthStore((s) => s.user);
    const profile = useProfileStore((s) => s.profile);
    // Linking ends the anonymous state right away, but the confirmation of the
    // flow must stay on screen until the user taps "Listo".
    const [linkedHere, setLinkedHere] = useState(false);

    // Signed out (the proxy normally catches this first).
    useEffect(() => {
        if (authUser === null) router.replace("/login");
    }, [authUser, router]);

    if (!authUser || profile === undefined) return <ProfileSkeleton />;

    if (shouldOfferEmailLink(authUser) || linkedHere) {
        return (
            <div className="flex flex-col gap-4 px-4 py-4">
                <BackButton />
                <h1 className="heading-5 text-text-primary">Vinculá tu email</h1>
                <p className="body-6 text-text-secondary">
                    Para crear tu perfil primero necesitás un email. Tus rutinas y registros se
                    mantienen: es la misma cuenta.
                </p>
                <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                    <LinkEmailFlow
                        onLinked={() => setLinkedHere(true)}
                        onDone={() => setLinkedHere(false)}
                    />
                </div>
            </div>
        );
    }

    return <ProfileForm userId={authUser.id} profile={profile} />;
}
