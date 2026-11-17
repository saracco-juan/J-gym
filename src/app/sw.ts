/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

/** How long to wait for the network before serving the cached copy. */
const NETWORK_TIMEOUT_SECONDS = 3;

/** Routes of the authenticated area that must open without a connection. */
const APP_SHELL_PREFIXES = ["/dashboard", "/workout", "/onboarding", "/history"];

const isAppShellPath = (pathname: string) =>
    APP_SHELL_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

/**
 * A redirected response (e.g. the proxy sending a signed-out user to /login)
 * must never be stored: replaying it for a navigation request is rejected by
 * the browser and would also cache the wrong page under the app route.
 */
const skipRedirects = {
    cacheWillUpdate: async ({ response }: { response: Response }) =>
        response.redirected ? null : response,
};

const expiration = () =>
    new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 7 * 24 * 60 * 60 });

/**
 * Supabase API calls (auth, REST) are never cached. User data already lives
 * in IndexedDB, and a cached API response could outlive a sign-out or feed
 * stale rows to the sync engine.
 */
const supabaseBypass: RuntimeCaching = {
    matcher: ({ url }) => url.hostname.endsWith(".supabase.co"),
    handler: new NetworkOnly(),
};

const appShellCaching: RuntimeCaching[] = [
    // Hard loads: the HTML document of an app route. Also matches the
    // background warm-up fetch (see AppShellWarmup), which asks for text/html.
    {
        matcher: ({ request, sameOrigin, url }) =>
            sameOrigin &&
            request.headers.get("RSC") !== "1" &&
            (request.mode === "navigate" ||
                request.headers.get("Accept")?.includes("text/html") === true) &&
            isAppShellPath(url.pathname),
        handler: new NetworkFirst({
            cacheName: "app-pages",
            networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
            matchOptions: { ignoreVary: true },
            plugins: [skipRedirects, expiration()],
        }),
    },
    // Client-side navigations: the RSC payload. The `_rsc` query param changes
    // between requests, so the lookup ignores the search string.
    {
        matcher: ({ request, sameOrigin, url }) =>
            sameOrigin &&
            request.headers.get("RSC") === "1" &&
            request.headers.get("Next-Router-Prefetch") !== "1" &&
            isAppShellPath(url.pathname),
        handler: new NetworkFirst({
            cacheName: "app-rsc",
            networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
            matchOptions: { ignoreSearch: true, ignoreVary: true },
            plugins: [skipRedirects, expiration()],
        }),
    },
    // Link prefetches are kept apart so a partial prefetch payload can never
    // answer a real navigation.
    {
        matcher: ({ request, sameOrigin, url }) =>
            sameOrigin &&
            request.headers.get("RSC") === "1" &&
            request.headers.get("Next-Router-Prefetch") === "1" &&
            isAppShellPath(url.pathname),
        handler: new NetworkFirst({
            cacheName: "app-rsc-prefetch",
            networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
            matchOptions: { ignoreSearch: true, ignoreVary: true },
            plugins: [skipRedirects, expiration()],
        }),
    },
];

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [supabaseBypass, ...appShellCaching, ...defaultCache],
    fallbacks: {
        entries: [
            {
                url: "/~offline",
                matcher: ({ request }) => request.destination === "document",
            },
        ],
    },
});

serwist.addEventListeners();
