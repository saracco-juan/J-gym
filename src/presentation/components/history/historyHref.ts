/** Link to the history screen of an exercise key (see `exerciseHistoryKey`). */
export function historyHref(key: string): string {
    return `/history?ref=${encodeURIComponent(key)}`;
}
