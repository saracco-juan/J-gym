"use client";

export default function OfflineRetry() {
    return (
        <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white active:bg-emerald-700"
        >
            Reintentar
        </button>
    );
}
