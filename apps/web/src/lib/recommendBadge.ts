export type RecommendBadgeMark =
  | { kind: "count"; count: number }
  | { kind: "spread" };

/** Mosaic gold hex: 1–10 show the count; more than 10 fans two empty hexes. */
export function recommendBadgeMark(count: number): RecommendBadgeMark {
  if (count > 10) return { kind: "spread" };
  return { kind: "count", count };
}
