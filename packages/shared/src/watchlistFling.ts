import type { MediaType } from "./ids.js";

export type WatchlistFlingOrderInput = {
  orderedIds: readonly string[];
  mediaById: Readonly<Record<string, MediaType>>;
  mediaType: MediaType;
  nextVisibleIds: readonly string[];
};

export type WatchlistFlingOrderResult =
  | { ok: true; orderedIds: string[] }
  | { ok: false; error: "too-few" | "not-permutation" | "unchanged" };

function isPermutation(
  current: readonly string[],
  next: readonly string[]
): boolean {
  if (current.length !== next.length) return false;
  const remaining = new Map<string, number>();
  for (const id of current) {
    remaining.set(id, (remaining.get(id) ?? 0) + 1);
  }
  for (const id of next) {
    const left = remaining.get(id);
    if (!left) return false;
    if (left === 1) remaining.delete(id);
    else remaining.set(id, left - 1);
  }
  return remaining.size === 0;
}

export function applyWatchlistFlingOrder(
  input: WatchlistFlingOrderInput
): WatchlistFlingOrderResult {
  const visibleSlots: number[] = [];
  const currentVisible: string[] = [];
  for (let i = 0; i < input.orderedIds.length; i++) {
    const id = input.orderedIds[i];
    if (input.mediaById[id] === input.mediaType) {
      visibleSlots.push(i);
      currentVisible.push(id);
    }
  }

  if (visibleSlots.length < 2) {
    return { ok: false, error: "too-few" };
  }

  if (!isPermutation(currentVisible, input.nextVisibleIds)) {
    return { ok: false, error: "not-permutation" };
  }

  if (currentVisible.join("|") === input.nextVisibleIds.join("|")) {
    return { ok: false, error: "unchanged" };
  }

  const next = [...input.orderedIds];
  for (let i = 0; i < visibleSlots.length; i++) {
    next[visibleSlots[i]] = input.nextVisibleIds[i];
  }
  return { ok: true, orderedIds: next };
}

function fisherYates<T>(items: readonly T[], random: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = next[i];
    const b = next[j];
    if (a === undefined || b === undefined) continue;
    next[i] = b;
    next[j] = a;
  }
  return next;
}

export function shuffleVisibleWatchlistIds(
  orderedIds: readonly string[],
  mediaById: Readonly<Record<string, MediaType>>,
  mediaType: MediaType,
  random: () => number = Math.random,
  focusedSlot?: number
): WatchlistFlingOrderResult {
  const visible = orderedIds.filter((id) => mediaById[id] === mediaType);
  if (visible.length < 2) return { ok: false, error: "too-few" };

  const hold =
    focusedSlot !== undefined &&
    Number.isInteger(focusedSlot) &&
    focusedSlot >= 0 &&
    focusedSlot < visible.length
      ? focusedSlot
      : Math.floor((visible.length - 1) / 2);
  const current = visible[hold];
  const candidates = visible.filter((id) => id !== current);
  if (!current || candidates.length === 0) {
    return { ok: false, error: "unchanged" };
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const pick = Math.floor(random() * candidates.length);
    const newFocus = candidates[Math.min(Math.max(pick, 0), candidates.length - 1)];
    if (!newFocus) continue;
    const remaining = visible.filter((id) => id !== newFocus);
    const shuffledRest = fisherYates(remaining, random);
    const nextVisible: string[] = [];
    let restI = 0;
    for (let i = 0; i < visible.length; i++) {
      if (i === hold) {
        nextVisible.push(newFocus);
        continue;
      }
      const id = shuffledRest[restI];
      restI += 1;
      if (id) nextVisible.push(id);
    }
    const result = applyWatchlistFlingOrder({
      orderedIds,
      mediaById,
      mediaType,
      nextVisibleIds: nextVisible,
    });
    if (result.ok || result.error !== "unchanged") return result;
  }
  return { ok: false, error: "unchanged" };
}
