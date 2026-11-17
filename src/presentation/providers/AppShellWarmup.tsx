"use client";

/**
 * AppShellWarmup: once the service worker controls the page, fetches the app
 * routes in the background so their documents and RSC payloads are cached.
 * Without it, only the routes already visited would open offline.
 */

import { useEffect } from "react";

const ROUTES = ["/dashboard", "/workout", "/onboarding"];

async function warmRoute(path: string) {
    // The service worker stores both flavours: HTML (hard load) and RSC
    // (client navigation). Failures are harmless: it is only an optimisation.
    await Promise.allSettled([
        fetch(path, { headers: { Accept: "text/html" } }),
        fetch(path, { headers: { RSC: "1" } }),
    ]);
}

/** Resolves once this page is controlled (fetches only reach the SW then). */
function whenControlled(): Promise<void> {
    const sw = navigator.serviceWorker;
    if (sw.controller) return Promise.resolve();
    return new Promise((resolve) => {
        sw.addEventListener("controllerchange", () => resolve(), { once: true });
    });
}

export default function AppShellWarmup() {
    useEffect(() => {
        if (!("serviceWorker" in navigator) || !navigator.onLine) return;
        let cancelled = false;
        void whenControlled().then(async () => {
            for (const path of ROUTES) {
                if (cancelled) return;
                await warmRoute(path);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}
