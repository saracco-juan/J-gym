import { CloudSlash } from "@phosphor-icons/react/dist/ssr";
import OfflineRetry from "./OfflineRetry";

/** Precached by the service worker; shown for navigations that are not cached. */
export default function OfflinePage() {
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-base px-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-xl border border-surface-border bg-surface-raised">
                <CloudSlash size={32} weight="bold" className="text-text-muted" />
            </div>
            <h1 className="heading-5 text-text-primary">Sin conexión</h1>
            <p className="body-6 max-w-xs text-text-secondary">
                Esta pantalla todavía no está guardada en tu dispositivo. Abrila
                una vez con conexión y después vas a poder usarla sin señal.
            </p>
            <OfflineRetry />
        </main>
    );
}
