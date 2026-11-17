"use client";

/**
 * ExerciseHistoryView — progress of one exercise.
 *
 * The exercise comes from the `ref` search param (see `exerciseHistoryKey`).
 * Everything is read from the local database, so it works offline.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { getLocalRepositories } from "@/infrastructure/local/localRepositories";
import { loadExerciseHistory, type ExerciseHistoryResult } from "@/infrastructure/local/queries";
import { useSyncStore } from "@/presentation/stores/useSyncStore";
import HistoryContent from "./HistoryContent";
import HistorySkeleton from "./HistorySkeleton";

function BackButton() {
    const router = useRouter();
    return (
        <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
            className="btn-icon -ml-3"
            aria-label="Volver"
        >
            <ArrowLeft size={24} weight="bold" />
        </button>
    );
}

function HistoryScreen() {
    const searchParams = useSearchParams();
    const key = searchParams.get("ref");
    const userId = useSyncStore((s) => s.userId);
    const [history, setHistory] = useState<ExerciseHistoryResult | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!userId || !key) return;
        let cancelled = false;
        loadExerciseHistory(getLocalRepositories(), userId, key)
            .then((result) => {
                if (!cancelled) setHistory(result);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [userId, key]);

    if (!key || userId === null) {
        return (
            <div className="px-4 py-12 text-center">
                <h2 className="title-2 text-text-primary">Ejercicio no encontrado</h2>
                <p className="body-6 mt-2 text-text-secondary">
                    Abre el historial desde un ejercicio de tu rutina o de un entrenamiento.
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div role="alert" className="mx-4 rounded-xl border border-danger-border bg-danger-soft px-4 py-3">
                <p className="body-6 text-danger-text">No se pudo cargar el historial. Cierra la pantalla e intenta de nuevo.</p>
            </div>
        );
    }

    if (!history) return <HistorySkeleton />;

    return (
        <div className="flex flex-col gap-4 px-4 pb-8">
            <div>
                <h1 className="heading-5 text-text-primary">{history.name}</h1>
                <p className="caption-5 text-text-muted">Historial y progreso</p>
            </div>
            <HistoryContent history={history} />
        </div>
    );
}

export default function ExerciseHistoryView() {
    return (
        <div className="flex flex-col gap-4">
            <div className="sticky top-0 z-40 bg-surface-base/95 px-4 pt-3 backdrop-blur-sm">
                <BackButton />
            </div>
            <Suspense fallback={<HistorySkeleton />}>
                <HistoryScreen />
            </Suspense>
        </div>
    );
}
