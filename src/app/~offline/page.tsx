import OfflineRetry from "./OfflineRetry";

/** Precached by the service worker; shown for navigations that are not cached. */
export default function OfflinePage() {
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center">
            <h1 className="text-2xl font-semibold text-white">Sin conexión</h1>
            <p className="max-w-xs text-sm text-zinc-400">
                Esta pantalla todavía no está guardada en tu dispositivo. Abrila
                una vez con conexión y después vas a poder usarla sin señal.
            </p>
            <OfflineRetry />
        </main>
    );
}
