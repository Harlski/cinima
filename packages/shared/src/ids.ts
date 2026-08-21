export type MediaType = "movie" | "tv";
export type MediaKind = MediaType;

export type TitleId = string & { __brand: "TitleId" };

/** Create canonical title id: `tmdb:movie:<tmdbId>` or `tmdb:tv:<tmdbId>` */
export function makeTitleId(mediaType: MediaType, tmdbId: number): TitleId {
  return `tmdb:${mediaType}:${tmdbId}` as TitleId;
}

/** Alias */
export const titleId = makeTitleId;

export function parseTitleId(id: string): { mediaType: MediaType; tmdbId: number } | null {
  const m = /^tmdb:(movie|tv):(\d+)$/.exec(id.trim());
  if (!m) return null;
  return { mediaType: m[1] as MediaType, tmdbId: Number(m[2]) };
}

export function isTitleId(id: string): boolean {
  return parseTitleId(id) != null;
}
