export const SUGGESTION_WINDOW_SIZE = 7;

export function centerIndex(length: number): number {
  if (length <= 0) return 0;
  return Math.floor((length - 1) / 2);
}

export function initialSuggestionWindow<T>(
  pool: readonly T[],
  size = SUGGESTION_WINDOW_SIZE
): T[] {
  return pool.slice(0, size);
}

export function nextSuggestionWindow<T extends { title: { id: string } }>(
  pool: readonly T[],
  currentIds: readonly string[],
  size = SUGGESTION_WINDOW_SIZE,
  random: () => number = Math.random
): T[] {
  const take = Math.min(size, pool.length);
  if (take === 0) return [];

  const prev = new Set(currentIds);
  const unused = pool.filter((item) => !prev.has(item.title.id));
  if (unused.length > 0) {
    return shuffle(unused, random).slice(0, take);
  }

  return shuffle([...pool], random).slice(0, take);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = copy[i]!;
    const b = copy[j]!;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}
