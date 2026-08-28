import type { TitleSummary } from "@cinima/shared";

/**
 * Profile Favorites lists show Favorite-only titles.
 * Recommended titles belong under Recommends, not again under Favorites.
 */
export function favoriteOnlyTitles(
  favorites: readonly TitleSummary[],
  recommends: readonly TitleSummary[]
): TitleSummary[] {
  const recommendedIds = new Set(recommends.map((t) => t.id));
  return favorites.filter((t) => !t.recommended && !recommendedIds.has(t.id));
}
