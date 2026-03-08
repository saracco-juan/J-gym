/**
 * NotificationService — Gestión de permisos y notificaciones push.
 *
 * Solicita permisos del navegador para mostrar notificaciones
 * y registra el service worker para eventos push.
 */

export class NotificationService {
    /**
     * Verifica si el navegador soporta notificaciones.
     */
    static isSupported(): boolean {
        return typeof window !== "undefined" && "Notification" in window;
    }

    /**
     * Solicita permiso al usuario para enviar notificaciones.
     * Retorna "granted", "denied" o "default".
     */
    static async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) return "denied";
        return await Notification.requestPermission();
    }

    /**
     * Retorna el estado actual del permiso.
     */
    static getPermissionStatus(): NotificationPermission | "unsupported" {
        if (!this.isSupported()) return "unsupported";
        return Notification.permission;
    }

    /**
     * Envía una notificación local (no push).
     * Útil para feedback inmediato (PRs, completar entrenamiento).
     */
    static async sendLocal(title: string, options?: NotificationOptions): Promise<void> {
        if (!this.isSupported()) return;
        if (Notification.permission !== "granted") return;

        // Si hay un SW registrado, usar showNotification (funciona en background)
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration) {
            await registration.showNotification(title, {
                icon: "/icons/icon-192x192.png",
                badge: "/icons/icon-96x96.png",
                ...options,
            });
        } else {
            new Notification(title, options);
        }
    }

    /**
     * Registra el service worker para recibir push events.
     * Retorna la suscripción push si se logra, o null.
     */
    static async subscribeToPush(): Promise<PushSubscription | null> {
        if (!("serviceWorker" in navigator)) return null;

        try {
            const registration = await navigator.serviceWorker.ready;

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            });

            return subscription;
        } catch (error) {
            console.error("[NotificationService] Push subscription failed:", error);
            return null;
        }
    }
}
