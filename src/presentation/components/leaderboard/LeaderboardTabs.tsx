"use client";

/**
 * LeaderboardTabs: accessible tab list (WAI-ARIA tabs pattern). Arrow keys,
 * Home and End move between tabs; only the selected tab is in the tab order.
 * The panel it controls is rendered by the parent with `tabPanelId`.
 */

import { useRef, type KeyboardEvent } from "react";
import { LEADERBOARD_TABS, type LeaderboardTab } from "@/core/leaderboard";

export const tabId = (tab: LeaderboardTab) => `leaderboard-tab-${tab}`;
export const TAB_PANEL_ID = "leaderboard-panel";

interface LeaderboardTabsProps {
    selected: LeaderboardTab;
    onSelect: (tab: LeaderboardTab) => void;
}

export default function LeaderboardTabs({ selected, onSelect }: LeaderboardTabsProps) {
    const refs = useRef<Record<string, HTMLButtonElement | null>>({});

    const move = (index: number) => {
        const next = LEADERBOARD_TABS[(index + LEADERBOARD_TABS.length) % LEADERBOARD_TABS.length];
        onSelect(next.id);
        refs.current[next.id]?.focus();
    };

    const onKeyDown = (event: KeyboardEvent, index: number) => {
        const keys: Record<string, number> = {
            ArrowRight: index + 1,
            ArrowLeft: index - 1,
            Home: 0,
            End: LEADERBOARD_TABS.length - 1,
        };
        if (!(event.key in keys)) return;
        event.preventDefault();
        move(keys[event.key]);
    };

    return (
        <div
            role="tablist"
            aria-label="Ordenar la tabla por"
            className="grid grid-cols-3 gap-1 rounded-xl border border-surface-border bg-surface-raised p-1"
        >
            {LEADERBOARD_TABS.map((tab, index) => {
                const isSelected = tab.id === selected;
                return (
                    <button
                        key={tab.id}
                        ref={(node) => {
                            refs.current[tab.id] = node;
                        }}
                        id={tabId(tab.id)}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        aria-controls={TAB_PANEL_ID}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => onSelect(tab.id)}
                        onKeyDown={(e) => onKeyDown(e, index)}
                        className={`pressable caption-3 min-h-12 rounded-lg px-2 py-2 text-center ${
                            isSelected
                                ? "bg-accent text-text-primary"
                                : "text-text-secondary hover:bg-surface-strong hover:text-text-primary"
                        }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
