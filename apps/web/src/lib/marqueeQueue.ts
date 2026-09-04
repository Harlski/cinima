import type { AchievementKind } from "@cinima/shared";

export type MarqueeItem = {
  kind: AchievementKind;
};

export type MarqueeQueue = {
  items: readonly MarqueeItem[];
};

export function emptyMarqueeQueue(): MarqueeQueue {
  return { items: [] };
}

export function currentMarquee(queue: MarqueeQueue): MarqueeItem | null {
  return queue.items[0] ?? null;
}

export function enqueueMarquee(queue: MarqueeQueue, item: MarqueeItem): MarqueeQueue {
  if (queue.items.some((row) => row.kind === item.kind)) return queue;
  return { items: [...queue.items, item] };
}

export function dismissMarquee(queue: MarqueeQueue): MarqueeQueue {
  return { items: queue.items.slice(1) };
}
