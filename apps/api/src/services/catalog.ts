import { CATALOG_TTL_DAYS, makeTitleId, parseTitleId, type MediaType } from "@nimcharts/shared";
import { eq, like, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { episodes, ratingSnapshots, titles } from "../db/schema.js";
import { config } from "../lib/config.js";
import { toTitleSummary } from "../lib/titles.js";

const TTL_MS = CATALOG_TTL_DAYS * 24 * 60 * 60 * 1000;

function isStale(fetchedAt: Date | null | undefined): boolean {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt.getTime() > TTL_MS;
}

async function tmdbFetch(path: string): Promise<unknown | null> {
  if (!config.tmdbApiKey) return null;
  const url = `https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${config.tmdbApiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function omdbFetch(params: Record<string, string>): Promise<unknown | null> {
  if (!config.omdbApiKey) return null;
  const qs = new URLSearchParams({ ...params, apikey: config.omdbApiKey });
  try {
    const res = await fetch(`https://www.omdbapi.com/?${qs}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function yearFromDate(d?: string | null): number | null {
  if (!d) return null;
  const y = Number(String(d).slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

async function upsertFromTmdb(mediaType: MediaType, tmdbId: number): Promise<string | null> {
  const path = mediaType === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const data = (await tmdbFetch(path)) as Record<string, unknown> | null;
  if (!data || data.success === false) return null;

  const id = makeTitleId(mediaType, tmdbId);
  const name =
    mediaType === "movie"
      ? String(data.title ?? data.original_title ?? "Untitled")
      : String(data.name ?? data.original_name ?? "Untitled");
  const year =
    mediaType === "movie"
      ? yearFromDate(data.release_date as string)
      : yearFromDate(data.first_air_date as string);
  const posterPath = (data.poster_path as string) || null;
  const overview = (data.overview as string) || null;
  const tmdbRating = data.vote_average != null ? String(data.vote_average) : null;
  let imdbId =
    mediaType === "movie" ? ((data.imdb_id as string) || null) : null;

  if (mediaType === "tv" && !imdbId) {
    const ext = (await tmdbFetch(`/tv/${tmdbId}/external_ids`)) as { imdb_id?: string } | null;
    imdbId = ext?.imdb_id ?? null;
  }

  let imdbRating: string | null = null;
  if (imdbId) {
    const omdb = (await omdbFetch({ i: imdbId })) as { imdbRating?: string; Response?: string } | null;
    if (omdb && omdb.Response !== "False" && omdb.imdbRating && omdb.imdbRating !== "N/A") {
      imdbRating = omdb.imdbRating;
    }
  }

  const now = new Date();
  await db
    .insert(titles)
    .values({
      id,
      mediaType,
      tmdbId,
      title: name,
      year,
      posterPath,
      overview,
      imdbId,
      imdbRating,
      tmdbRating,
      fetchedAt: now,
      source: "tmdb+omdb",
    })
    .onConflictDoUpdate({
      target: titles.id,
      set: {
        title: name,
        year,
        posterPath,
        overview,
        imdbId,
        imdbRating,
        tmdbRating,
        fetchedAt: now,
        source: "tmdb+omdb",
      },
    });

  await db.insert(ratingSnapshots).values({
    titleId: id,
    source: "tmdb+omdb",
    rating: imdbRating ?? tmdbRating,
    rawJson: JSON.stringify({ tmdbId, imdbId, imdbRating, tmdbRating }),
    fetchedAt: now,
  });

  if (mediaType === "tv") await syncTvEpisodes(id, tmdbId, imdbId);
  return id;
}

async function syncTvEpisodes(titleIdValue: string, tmdbId: number, imdbId: string | null) {
  const show = (await tmdbFetch(`/tv/${tmdbId}`)) as { number_of_seasons?: number } | null;
  const seasons = Math.min(show?.number_of_seasons ?? 0, 6);
  const now = new Date();

  for (let season = 1; season <= seasons; season++) {
    const seasonData = (await tmdbFetch(`/tv/${tmdbId}/season/${season}`)) as {
      episodes?: Array<{ episode_number: number; name?: string }>;
    } | null;
    const eps = seasonData?.episodes ?? [];

    let omdbEps: Array<{ Episode?: string; imdbRating?: string }> | null = null;
    if (imdbId && config.omdbApiKey) {
      const omdb = (await omdbFetch({ i: imdbId, Season: String(season) })) as {
        Episodes?: Array<{ Episode?: string; imdbRating?: string }>;
        Response?: string;
      } | null;
      if (omdb && omdb.Response !== "False") omdbEps = omdb.Episodes ?? [];
    }

    for (const ep of eps) {
      const epNum = ep.episode_number;
      const omdbMatch = omdbEps?.find((e) => Number(e.Episode) === epNum);
      const rating =
        omdbMatch?.imdbRating && omdbMatch.imdbRating !== "N/A" ? omdbMatch.imdbRating : null;

      await db
        .insert(episodes)
        .values({
          titleId: titleIdValue,
          season,
          episode: epNum,
          name: ep.name ?? null,
          imdbRating: rating,
          fetchedAt: now,
        })
        .onConflictDoUpdate({
          target: [episodes.titleId, episodes.season, episodes.episode],
          set: { name: ep.name ?? null, imdbRating: rating, fetchedAt: now },
        });
    }
  }
}

export async function searchCatalog(query: string, limit = 24) {
  const q = query.trim();
  if (!q) {
    const rows = await db.select().from(titles).orderBy(sql`title`).limit(limit);
    return rows.map(toTitleSummary);
  }

  let rows = await db
    .select()
    .from(titles)
    .where(or(like(titles.title, `%${q}%`), like(titles.overview, `%${q}%`)))
    .limit(limit);

  if (rows.length < 5 && config.tmdbApiKey) {
    const movieRes = (await tmdbFetch(
      `/search/movie?query=${encodeURIComponent(q)}&include_adult=false`
    )) as { results?: Array<{ id: number }> } | null;
    const tvRes = (await tmdbFetch(
      `/search/tv?query=${encodeURIComponent(q)}&include_adult=false`
    )) as { results?: Array<{ id: number }> } | null;

    for (const id of (movieRes?.results ?? []).slice(0, 5).map((r) => r.id)) {
      await upsertFromTmdb("movie", id);
    }
    for (const id of (tvRes?.results ?? []).slice(0, 5).map((r) => r.id)) {
      await upsertFromTmdb("tv", id);
    }

    rows = await db
      .select()
      .from(titles)
      .where(or(like(titles.title, `%${q}%`), like(titles.overview, `%${q}%`)))
      .limit(limit);
  }

  return rows.map(toTitleSummary);
}

export async function ensureTitleFresh(id: string) {
  const parsed = parseTitleId(id);
  if (!parsed) {
    const [row] = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
    return row ?? null;
  }

  const [row] = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
  if (row && !isStale(row.fetchedAt)) return row;

  if (config.tmdbApiKey) {
    await upsertFromTmdb(parsed.mediaType, parsed.tmdbId);
    const [fresh] = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
    return fresh ?? row ?? null;
  }
  return row ?? null;
}

export async function getEpisodesForTitle(titleIdValue: string) {
  return db
    .select()
    .from(episodes)
    .where(eq(episodes.titleId, titleIdValue))
    .orderBy(episodes.season, episodes.episode);
}

export async function listPopular(limit = 40) {
  const rows = await db
    .select()
    .from(titles)
    .orderBy(sql`CAST(COALESCE(imdb_rating, tmdb_rating, '0') AS REAL) DESC`)
    .limit(limit);
  return rows.map(toTitleSummary);
}
