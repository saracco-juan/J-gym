"use client";

export default function OfflineRetry() {
    return (
        <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary button-md"
        >
            Reintentar
        </button>
    );
}
