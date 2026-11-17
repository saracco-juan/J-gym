/**
 * Profile Page: choose the display name and avatar color (setup after
 * onboarding, or editing from the profile menu).
 *
 * Authentication is handled by the proxy; data comes from the local database.
 */

import ProfileView from "@/presentation/components/profile/ProfileView";

export default function ProfilePage() {
    return (
        <main className="min-h-dvh bg-surface-base">
            <ProfileView />
        </main>
    );
}
