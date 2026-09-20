import type { MediaType, TitleSummary } from "@cinima/shared";

export type MosaicMediaFilter = MediaType | "all";

export type CommunityRecommendItem = {
  title: TitleSummary;
  recommendCount: number;
};

export function recommendCountLabel(count: number): string {
  return count === 1 ? "1 Recommend" : `${count} Recommends`;
}

export function communityRecommendItem(title: TitleSummary): CommunityRecommendItem {
  return {
    title,
    recommendCount: title.recommendCount ?? 1,
  };
}

export function rankedCommunityRecommends<T extends CommunityRecommendItem>(
  rows: readonly T[]
): T[] {
  return [...rows].sort(compareCommunityRecommend);
}

export function mosaicCommunityRecommends<T extends CommunityRecommendItem>(
  movies: readonly T[],
  tv: readonly T[],
  filter: MosaicMediaFilter
): T[] {
  const rows =
    filter === "movie" ? movies : filter === "tv" ? tv : [...movies, ...tv];
  return rankedCommunityRecommends(rows);
}

function compareCommunityRecommend(
  a: CommunityRecommendItem,
  b: CommunityRecommendItem
): number {
  if (a.recommendCount !== b.recommendCount) {
    return b.recommendCount - a.recommendCount;
  }
  const aMovie = a.title.mediaType === "movie" ? 0 : 1;
  const bMovie = b.title.mediaType === "movie" ? 0 : 1;
  return aMovie - bMovie;
}
