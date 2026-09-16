export type ForYouSelection = {
  windowIds: string[];
  selectedTitleId: string;
};

export function captureForYouSelection(
  windowItems: readonly { title: { id: string } }[],
  selectedIndex: number
): ForYouSelection | null {
  const selected = windowItems[selectedIndex];
  if (!selected) return null;
  return {
    windowIds: windowItems.map((entry) => entry.title.id),
    selectedTitleId: selected.title.id,
  };
}

let sessionSelection: ForYouSelection | null = null;

export function saveForYouSelection(selection: ForYouSelection | null): void {
  sessionSelection = selection;
}

export function loadForYouSelection(): ForYouSelection | null {
  return sessionSelection;
}

function centerIndex(length: number): number {
  if (length <= 0) return 0;
  return Math.floor((length - 1) / 2);
}

export function restoreForYouWindow<T extends { title: { id: string } }>(
  pool: readonly T[],
  remembered: ForYouSelection | null
): { window: T[]; selectedIndex: number } {
  if (!remembered) {
    return { window: [...pool], selectedIndex: centerIndex(pool.length) };
  }

  const byId = new Map(pool.map((entry) => [entry.title.id, entry]));
  const window = remembered.windowIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });

  if (window.length === 0) {
    return { window: [...pool], selectedIndex: centerIndex(pool.length) };
  }

  const selectedIndex = window.findIndex(
    (entry) => entry.title.id === remembered.selectedTitleId
  );
  return {
    window,
    selectedIndex:
      selectedIndex >= 0 ? selectedIndex : centerIndex(window.length),
  };
}

export const FOR_YOU_REFRESH_QUERY = "forYou";
export const FOR_YOU_REFRESH_VALUE = "refresh";

/** After Landing Enter / Explore CINIMA, Discover should reload For You. */
export function discoverLocationAfterLandingEnter(
  pendingPath: string | null | undefined
): string | { name: "discover"; query: Record<string, string> } {
  if (pendingPath) return pendingPath;
  return {
    name: "discover",
    query: { [FOR_YOU_REFRESH_QUERY]: FOR_YOU_REFRESH_VALUE },
  };
}

export function isForYouRefreshQuery(query: { forYou?: unknown }): boolean {
  const value = query.forYou;
  if (Array.isArray(value)) return value[0] === FOR_YOU_REFRESH_VALUE;
  return value === FOR_YOU_REFRESH_VALUE;
}

export function stripForYouRefreshQuery(
  query: Record<string, unknown>
): Record<string, unknown> {
  if (!(FOR_YOU_REFRESH_QUERY in query)) return query;
  const next = { ...query };
  delete next[FOR_YOU_REFRESH_QUERY];
  return next;
}
