import type { MediaType } from "@cinima/shared";

/**
 * Prefer a KindTabs media type that has content.
 * Ties and both-empty prefer movies.
 */
export function pickDefaultMediaKind(
  movieCount: number,
  tvCount: number
): MediaType {
  if (tvCount > 0 && movieCount === 0) return "tv";
  if (movieCount > 0 && tvCount === 0) return "movie";
  if (tvCount > movieCount) return "tv";
  return "movie";
}
