"use client";

/**
 * LeaderboardLink: trophy button of the dashboard header that opens the gym
 * table. Presentational.
 */

import Link from "next/link";
import { Trophy } from "@phosphor-icons/react";

export default function LeaderboardLink() {
    return (
        <Link href="/leaderboard" className="btn-icon" aria-label="Tabla del gym">
            <Trophy size={24} weight="bold" aria-hidden="true" />
        </Link>
    );
}
