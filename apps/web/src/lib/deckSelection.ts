export type DeckSelection = {
  itemIds: string[];
  selectedTitleId: string;
};

const sessionSelections = new Map<string, DeckSelection>();

export function captureDeckSelection(
  items: readonly { title: { id: string } }[],
  selectedIndex: number
): DeckSelection | null {
  const selected = items[selectedIndex];
  if (!selected) return null;
  return {
    itemIds: items.map((entry) => entry.title.id),
    selectedTitleId: selected.title.id,
  };
}

export function saveDeckSelection(key: string, selection: DeckSelection | null): void {
  if (selection) sessionSelections.set(key, selection);
  else sessionSelections.delete(key);
}

export function loadDeckSelection(key: string): DeckSelection | null {
  return sessionSelections.get(key) ?? null;
}

export function restoreDeckWindow<T extends { title: { id: string } }>(
  pool: readonly T[],
  remembered: DeckSelection | null
): { items: T[]; selectedIndex: number } {
  if (!remembered || pool.length === 0) {
    return { items: [...pool], selectedIndex: centerIndex(pool.length) };
  }

  const byId = new Map(pool.map((entry) => [entry.title.id, entry]));
  const items = remembered.itemIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });

  if (items.length === 0) {
    return { items: [...pool], selectedIndex: centerIndex(pool.length) };
  }

  const selectedIndex = items.findIndex(
    (entry) => entry.title.id === remembered.selectedTitleId
  );
  return {
    items,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : centerIndex(items.length),
  };
}

function centerIndex(length: number): number {
  if (length <= 0) return 0;
  return Math.floor((length - 1) / 2);
}

/** Explicit poster clicks win over scroll-sync at strip edges. */
export function resolveDeckScrollIndex(
  pinnedIndex: number | null,
  nearestIndex: number
): number {
  return pinnedIndex ?? nearestIndex;
}

export function deckScrollLeftToCenter(
  strip: Pick<HTMLElement, "clientWidth" | "scrollWidth" | "children">,
  index: number
): number {
  const item = strip.children[index] as HTMLElement | undefined;
  if (!item) return 0;
  const target =
    item.offsetLeft + item.offsetWidth / 2 - strip.clientWidth / 2;
  const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
  return Math.max(0, Math.min(target, max));
}
