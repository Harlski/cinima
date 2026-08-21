import {
  centerIndex,
  initialSuggestionWindow,
} from "./suggestionDeck";

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

export function restoreForYouWindow<T extends { title: { id: string } }>(
  pool: readonly T[],
  remembered: ForYouSelection | null,
  size?: number
): { window: T[]; selectedIndex: number } {
  if (!remembered) {
    const window = initialSuggestionWindow(pool, size);
    return { window, selectedIndex: centerIndex(window.length) };
  }

  const byId = new Map(pool.map((entry) => [entry.title.id, entry]));
  const window = remembered.windowIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });

  if (window.length === 0) {
    const fallback = initialSuggestionWindow(pool, size);
    return { window: fallback, selectedIndex: centerIndex(fallback.length) };
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
