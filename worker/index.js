/**
 * Custom Service Worker — Push notifications & notificationclick.
 *
 * Este archivo se inyecta al SW generado por next-pwa via customWorkerDir.
 * Contiene los event listeners de push y notificationclick que next-pwa
 * no genera por defecto.
 */

// ─── Push Event ────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
    try {
        let data = {
            title: "J-GYM",
            body: "Tenes un entrenamiento pendiente.",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-96x96.png",
            url: "/dashboard",
        };

        if (event.data) {
            try {
                const payload = event.data.json();
                data = {
                    title: payload.title || data.title,
                    body: payload.body || data.body,
                    icon: payload.icon || data.icon,
                    badge: payload.badge || data.badge,
                    url: payload.url || data.url,
                };
            } catch {
                // Si el payload no es JSON, usar como texto plano
                const text = event.data.text();
                if (text) data.body = text;
            }
        }

        console.log("[SW] Push recibido:", data);

        const notificationPromise = self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            data: { url: data.url },
            vibrate: [200, 100, 200],
            requireInteraction: false,
        });

        event.waitUntil(notificationPromise);
    } catch (error) {
        console.error("[SW] Error procesando push:", error);

        // Fallback: mostrar notificación genérica
        event.waitUntil(
            self.registration.showNotification("J-GYM", {
                body: "Tenes un entrenamiento pendiente.",
                icon: "/icons/icon-192x192.png",
            })
        );
    }
});

// ─── Notification Click ────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Notification click:", event.notification.data);

    event.notification.close();

    const targetUrl = event.notification.data?.url || "/dashboard";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            // Si hay una pestaña abierta, enfocarla y navegar
            for (const client of clientList) {
                if ("focus" in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            // Si no hay ninguna abierta, abrir una nueva
            return self.clients.openWindow(targetUrl);
        })
    );
});
