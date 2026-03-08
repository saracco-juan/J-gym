"use client";

/**
 * NotificationDiag — Debug component that logs notification status on mount.
 *
 * Prints to console:
 * - Notification.permission
 * - navigator.serviceWorker.controller
 * - pushManager state
 *
 * Renders nothing — invisible diagnostic helper.
 */

import { useEffect } from "react";

export default function NotificationDiag() {
    useEffect(() => {
        checkNotificationStatus();
    }, []);

    return null;
}

async function checkNotificationStatus() {
    console.group("[NotificationDiag] Estado de notificaciones");

    // 1. Permission
    if ("Notification" in window) {
        console.log("Notification.permission:", Notification.permission);
    } else {
        console.warn("Notification API no soportada en este navegador.");
    }

    // 2. Service Worker controller
    if ("serviceWorker" in navigator) {
        const controller = navigator.serviceWorker.controller;
        console.log(
            "SW controller:",
            controller ? `activo (scriptURL: ${controller.scriptURL})` : "null (no activo)"
        );

        // 3. Push Manager
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            console.log(
                "PushManager subscription:",
                subscription ? "activa" : "sin suscripcion"
            );
            if (subscription) {
                console.log("Push endpoint:", subscription.endpoint);
            }
        } catch (error) {
            console.warn("PushManager error:", error);
        }
    } else {
        console.warn("Service Worker no soportado.");
    }

    console.groupEnd();
}
