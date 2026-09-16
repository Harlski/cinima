export type DeckSelection = {
  itemIds: string[];
  selectedTitleId: string;
};

const sessionSelections = new Map<string, DeckSelection>();

export function deckCenterIndex(length: number): number {
  if (length <= 0) return 0;
  return Math.floor((length - 1) / 2);
}

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
    return { items: [...pool], selectedIndex: deckCenterIndex(pool.length) };
  }

  const byId = new Map(pool.map((entry) => [entry.title.id, entry]));
  const items = remembered.itemIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });

  if (items.length === 0) {
    return { items: [...pool], selectedIndex: deckCenterIndex(pool.length) };
  }

  const selectedIndex = items.findIndex(
    (entry) => entry.title.id === remembered.selectedTitleId
  );
  return {
    items,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : deckCenterIndex(items.length),
  };
}

/** Trust parent item order (e.g. a refreshed suggestion window); keep selection if present. */
export function syncDeckItems<T extends { title: { id: string } }>(
  items: readonly T[],
  remembered: DeckSelection | null
): { items: T[]; selectedIndex: number } {
  const list = [...items];
  if (list.length === 0) {
    return { items: list, selectedIndex: 0 };
  }
  const selectedIndex = remembered
    ? list.findIndex((entry) => entry.title.id === remembered.selectedTitleId)
    : -1;
  return {
    items: list,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : deckCenterIndex(list.length),
  };
}

function isDeckSubsetRemoval(
  previousIds: readonly string[],
  nextIds: readonly string[]
): boolean {
  if (nextIds.length >= previousIds.length) return false;
  const previous = new Set(previousIds);
  return nextIds.every((id) => previous.has(id));
}

/**
 * After a Pass, land on the adjacent remaining card.
 * A newly dealt set still opens on the center card.
 */
export function selectedIndexAfterDeckChange(
  previousIds: readonly string[],
  nextIds: readonly string[],
  previousSelectedIndex: number
): number {
  if (nextIds.length === 0) return 0;
  if (!isDeckSubsetRemoval(previousIds, nextIds)) {
    return deckCenterIndex(nextIds.length);
  }
  const selectedId = previousIds[previousSelectedIndex];
  if (selectedId) {
    const kept = nextIds.indexOf(selectedId);
    if (kept >= 0) return kept;
  }
  return Math.min(Math.max(0, previousSelectedIndex), nextIds.length - 1);
}

/** Prefer a specific title (e.g. guided tour) over the session deck memory. */
export function rememberedSelectionForPreferred(
  items: readonly { title: { id: string } }[],
  preferredTitleId: string | null | undefined,
  fallback: DeckSelection | null
): DeckSelection | null {
  if (!preferredTitleId) return fallback;
  if (!items.some((entry) => entry.title.id === preferredTitleId)) return fallback;
  return {
    itemIds: items.map((entry) => entry.title.id),
    selectedTitleId: preferredTitleId,
  };
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
