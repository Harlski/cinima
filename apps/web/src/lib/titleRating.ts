/** Display string for a Catalog Rating, or an unrated placeholder. */
export function formatTitleRating(
  rating: number | null | undefined,
  unrated = "—"
): string {
  if (rating == null || Number.isNaN(rating)) return unrated;
  return rating.toFixed(1);
}

export function hasTitleRating(
  rating: number | null | undefined
): rating is number {
  return rating != null && !Number.isNaN(rating);
}
