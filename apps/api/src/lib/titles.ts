import type { TitleSummary } from "@cinima/shared";
import type { titles } from "../db/schema.js";

type TitleRow = typeof titles.$inferSelect;

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

export function posterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) return null;
  if (posterPath.startsWith("http")) return posterPath;
  return `${TMDB_IMG}${posterPath.startsWith("/") ? "" : "/"}${posterPath}`;
}

export function hasOverview(overview: string | null | undefined): boolean {
  return Boolean(overview?.trim());
}

export function toTitleSummary(row: TitleRow): TitleSummary {
  const mediaType = row.mediaType as "movie" | "tv";
  return {
    id: row.id as TitleSummary["id"],
    mediaType,
    kind: mediaType,
    tmdbId: row.tmdbId,
    title: row.title,
    year: row.year,
    posterUrl: posterUrl(row.posterPath),
    overview: row.overview,
    rating: row.rating != null ? Number(row.rating) : null,
    popularity: row.popularity ?? null,
    imdbId: row.imdbId ?? null,
  };
}
