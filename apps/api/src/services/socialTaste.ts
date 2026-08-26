import {
  DISCOVER_FAVORITE_WEIGHT,
  DISCOVER_RECOMMEND_WEIGHT,
  MAX_RECOMMENDS,
  MIN_FAVORITES_FOR_DISCOVER,
  normalizeWallet,
  type CommunityRecommendsResponse,
  type DiscoverResponse,
  type MediaType,
  type OverlapSuggestion,
  type TitleSummary,
} from "@cinima/shared";
import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { favorites, titles, users, watchlist } from "../db/schema.js";
import { hasOverview, toTitleSummary } from "../lib/titles.js";

export class SocialTasteError extends Error {
  constructor(
    readonly code: "not_favorited" | "recommend_cap" | "not_recommended",
    message: string
  ) {
    super(message);
    this.name = "SocialTasteError";
  }
}

function recommendKindLabel(mediaType: MediaType): string {
  return mediaType === "tv" ? "TV" : "movie";
}

async function titleMediaType(titleId: string): Promise<MediaType | null> {
  const [row] = await db
    .select({ mediaType: titles.mediaType })
    .from(titles)
    .where(eq(titles.id, titleId))
    .limit(1);
  if (!row?.mediaType) return null;
  return row.mediaType as MediaType;
}

function withRecommended(summary: TitleSummary, recommended: boolean): TitleSummary {
  return recommended ? { ...summary, recommended: true } : { ...summary, recommended: false };
}

export async function listFavorites(wallet: string) {
  const w = normalizeWallet(wallet);
  const rows = await db
    .select({ title: titles, recommendedAt: favorites.recommendedAt })
    .from(favorites)
    .innerJoin(titles, eq(favorites.titleId, titles.id))
    .where(eq(favorites.walletAddress, w))
    .orderBy(desc(favorites.createdAt));
  return rows.map((r) => withRecommended(toTitleSummary(r.title), r.recommendedAt != null));
}

export async function listRecommends(wallet: string) {
  const w = normalizeWallet(wallet);
  const rows = await db
    .select({ title: titles })
    .from(favorites)
    .innerJoin(titles, eq(favorites.titleId, titles.id))
    .where(and(eq(favorites.walletAddress, w), isNotNull(favorites.recommendedAt)))
    .orderBy(desc(favorites.recommendedAt));
  return rows.map((r) => withRecommended(toTitleSummary(r.title), true));
}

export async function addFavorite(wallet: string, titleId: string) {
  const w = normalizeWallet(wallet);
  await db
    .insert(favorites)
    .values({ walletAddress: w, titleId, createdAt: new Date(), recommendedAt: null })
    .onConflictDoNothing();
}

export async function removeFavorite(wallet: string, titleId: string) {
  const w = normalizeWallet(wallet);
  await db.delete(favorites).where(and(eq(favorites.walletAddress, w), eq(favorites.titleId, titleId)));
}

export async function favoriteCount(wallet: string) {
  const w = normalizeWallet(wallet);
  const [row] = await db.select({ c: count() }).from(favorites).where(eq(favorites.walletAddress, w));
  return Number(row?.c ?? 0);
}

export async function recommendCount(wallet: string) {
  const w = normalizeWallet(wallet);
  const [row] = await db
    .select({ c: count() })
    .from(favorites)
    .where(and(eq(favorites.walletAddress, w), isNotNull(favorites.recommendedAt)));
  return Number(row?.c ?? 0);
}

export async function isFavorited(wallet: string, titleId: string) {
  const w = normalizeWallet(wallet);
  const [row] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.walletAddress, w), eq(favorites.titleId, titleId)))
    .limit(1);
  return !!row;
}

export async function isRecommended(wallet: string, titleId: string) {
  const w = normalizeWallet(wallet);
  const [row] = await db
    .select()
    .from(favorites)
    .where(
      and(eq(favorites.walletAddress, w), eq(favorites.titleId, titleId), isNotNull(favorites.recommendedAt))
    )
    .limit(1);
  return !!row;
}

export async function setRecommend(wallet: string, titleId: string) {
  const w = normalizeWallet(wallet);
  const mediaType = await titleMediaType(titleId);
  if (!mediaType) throw new SocialTasteError("not_favorited", "Recommend requires a Favorite");

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(favorites)
      .where(and(eq(favorites.walletAddress, w), eq(favorites.titleId, titleId)))
      .limit(1);
    if (!row) throw new SocialTasteError("not_favorited", "Recommend requires a Favorite");
    if (row.recommendedAt) return;

    const [countRow] = await tx
      .select({ c: count() })
      .from(favorites)
      .innerJoin(titles, eq(favorites.titleId, titles.id))
      .where(
        and(
          eq(favorites.walletAddress, w),
          isNotNull(favorites.recommendedAt),
          eq(titles.mediaType, mediaType)
        )
      );
    const n = Number(countRow?.c ?? 0);
    if (n >= MAX_RECOMMENDS) {
      const kind = recommendKindLabel(mediaType);
      throw new SocialTasteError(
        "recommend_cap",
        `At most ${MAX_RECOMMENDS} ${kind} Recommends; remove one first`
      );
    }

    await tx
      .update(favorites)
      .set({ recommendedAt: new Date() })
      .where(and(eq(favorites.walletAddress, w), eq(favorites.titleId, titleId)));
  });
}

export async function clearRecommend(wallet: string, titleId: string) {
  const w = normalizeWallet(wallet);
  const [row] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.walletAddress, w), eq(favorites.titleId, titleId)))
    .limit(1);
  if (!row) throw new SocialTasteError("not_favorited", "Recommend requires a Favorite");
  if (!row.recommendedAt) throw new SocialTasteError("not_recommended", "Title is not Recommended");

  await db
    .update(favorites)
    .set({ recommendedAt: null })
    .where(and(eq(favorites.walletAddress, w), eq(favorites.titleId, titleId)));
}

function shuffleSuggestions<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = copy[i]!;
    const b = copy[j]!;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

async function popularSuggestions(excludeIds: Set<string>): Promise<OverlapSuggestion[]> {
  const popular = await db
    .select()
    .from(titles)
    .where(sql`TRIM(COALESCE(${titles.overview}, '')) != ''`)
    .orderBy(sql`CAST(COALESCE(rating, '0') AS REAL) DESC`)
    .limit(48);
  return shuffleSuggestions(
    popular
      .map(toTitleSummary)
      .filter((t) => !excludeIds.has(t.id))
      .map((title) => ({ title, sharedCount: 0, sampleWallets: [] }))
  ).slice(0, 20);
}

/** Cached titles with posters — top by TMDB popularity (popular catalog stand-in). */
const ONBOARDING_CANDIDATE_LIMIT = 100;

async function onboardingCandidates(excludeIds: Set<string>): Promise<TitleSummary[]> {
  const rows = await db
    .select()
    .from(titles)
    .where(
      and(
        sql`${titles.posterPath} IS NOT NULL AND TRIM(${titles.posterPath}) != ''`,
        sql`TRIM(COALESCE(${titles.overview}, '')) != ''`
      )
    )
    .orderBy(
      desc(titles.popularity),
      sql`CAST(COALESCE(${titles.rating}, '0') AS REAL) DESC`
    )
    .limit(ONBOARDING_CANDIDATE_LIMIT);

  return rows.map(toTitleSummary).filter((t) => !excludeIds.has(t.id));
}

export async function skipDiscoverOnboarding(wallet: string) {
  const w = normalizeWallet(wallet);
  await db
    .update(users)
    .set({ onboardingSkippedAt: new Date() })
    .where(eq(users.walletAddress, w));
}

async function popularByMediaType(
  mediaType: MediaType,
  excludeIds: Set<string>,
  limit: number
): Promise<TitleSummary[]> {
  const rows = await db
    .select()
    .from(titles)
    .where(
      and(
        eq(titles.mediaType, mediaType),
        sql`${titles.posterPath} IS NOT NULL AND TRIM(${titles.posterPath}) != ''`,
        sql`TRIM(COALESCE(${titles.overview}, '')) != ''`
      )
    )
    .orderBy(
      desc(titles.popularity),
      sql`CAST(COALESCE(${titles.rating}, '0') AS REAL) DESC`
    )
    .limit(limit + excludeIds.size + 8);

  return rows
    .map(toTitleSummary)
    .filter((t) => !excludeIds.has(t.id))
    .slice(0, limit);
}

/**
 * Titles others have gold-star Recommended, split by media type.
 * Excludes the caller's watchlist. Falls back to popular catalog per kind when sparse.
 */
export async function listCommunityRecommends(
  wallet: string,
  opts?: { limitPerKind?: number }
): Promise<CommunityRecommendsResponse> {
  const w = normalizeWallet(wallet);
  const limit = opts?.limitPerKind ?? 12;

  const watchRows = await db
    .select({ titleId: watchlist.titleId })
    .from(watchlist)
    .where(eq(watchlist.walletAddress, w));
  const exclude = new Set(watchRows.map((r) => r.titleId));

  const rows = await db
    .select({
      title: titles,
      recommendCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(favorites)
    .innerJoin(titles, eq(favorites.titleId, titles.id))
    .where(
      and(
        isNotNull(favorites.recommendedAt),
        sql`${favorites.walletAddress} != ${w}`,
        sql`${titles.posterPath} IS NOT NULL AND TRIM(${titles.posterPath}) != ''`
      )
    )
    .groupBy(titles.id)
    .orderBy(
      desc(sql`count(*)`),
      desc(titles.popularity),
      sql`CAST(COALESCE(${titles.rating}, '0') AS REAL) DESC`
    )
    .limit(limit * 4);

  const movies: TitleSummary[] = [];
  const tv: TitleSummary[] = [];
  for (const row of rows) {
    if (exclude.has(row.title.id)) continue;
    const summary = withRecommended(toTitleSummary(row.title), true);
    if (row.title.mediaType === "movie" && movies.length < limit) movies.push(summary);
    else if (row.title.mediaType === "tv" && tv.length < limit) tv.push(summary);
    if (movies.length >= limit && tv.length >= limit) break;
  }

  const used = new Set([...exclude, ...movies.map((t) => t.id), ...tv.map((t) => t.id)]);
  if (movies.length < limit) {
    movies.push(...(await popularByMediaType("movie", used, limit - movies.length)));
  }
  for (const t of movies) used.add(t.id);
  if (tv.length < limit) {
    tv.push(...(await popularByMediaType("tv", used, limit - tv.length)));
  }

  return { movies, tv };
}

/** Taste-overlap Discover — Recommend overlap outranks plain Favorite overlap. */
export async function discoverFor(
  wallet: string,
  opts?: { forceOnboarding?: boolean }
): Promise<DiscoverResponse> {
  const w = normalizeWallet(wallet);
  const favs = await db.select().from(favorites).where(eq(favorites.walletAddress, w));
  const myTitleIds = favs.map((f) => f.titleId);
  const myIds = new Set(myTitleIds);

  /** Demo / local: force Favorites onboarding UI regardless of skip or Favorite count. */
  if (opts?.forceOnboarding) {
    return {
      mode: "onboarding",
      favoriteCount: favs.length,
      minFavorites: MIN_FAVORITES_FOR_DISCOVER,
      onboardingCandidates: await onboardingCandidates(myIds),
    };
  }

  if (favs.length < MIN_FAVORITES_FOR_DISCOVER) {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, w)).limit(1);
    if (user?.onboardingSkippedAt) {
      return {
        mode: "overlap",
        favoriteCount: favs.length,
        minFavorites: MIN_FAVORITES_FOR_DISCOVER,
        suggestions: await popularSuggestions(myIds),
      };
    }

    return {
      mode: "onboarding",
      favoriteCount: favs.length,
      minFavorites: MIN_FAVORITES_FOR_DISCOVER,
      onboardingCandidates: await onboardingCandidates(myIds),
    };
  }

  const peerFavs = await db
    .select()
    .from(favorites)
    .where(and(inArray(favorites.titleId, myTitleIds), sql`${favorites.walletAddress} != ${w}`));

  const peerScores = new Map<string, number>();
  for (const p of peerFavs) {
    const weight = p.recommendedAt != null ? DISCOVER_RECOMMEND_WEIGHT : DISCOVER_FAVORITE_WEIGHT;
    peerScores.set(p.walletAddress, (peerScores.get(p.walletAddress) || 0) + weight);
  }
  const topPeers = [...peerScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([addr]) => addr);

  let suggestions: OverlapSuggestion[] = [];
  if (topPeers.length) {
    const their = await db
      .select()
      .from(favorites)
      .innerJoin(titles, eq(favorites.titleId, titles.id))
      .where(
        and(
          inArray(favorites.walletAddress, topPeers),
          sql`${favorites.titleId} NOT IN (${sql.join(
            myTitleIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
      );

    const map = new Map<
      string,
      { title: TitleSummary; wallets: Set<string>; score: number; sharedCount: number }
    >();
    for (const row of their) {
      const weight =
        row.favorites.recommendedAt != null ? DISCOVER_RECOMMEND_WEIGHT : DISCOVER_FAVORITE_WEIGHT;
      const cur = map.get(row.titles.id);
      if (cur) {
        cur.wallets.add(row.favorites.walletAddress);
        cur.score += weight;
        cur.sharedCount += 1;
      } else {
        map.set(row.titles.id, {
          title: toTitleSummary(row.titles),
          wallets: new Set([row.favorites.walletAddress]),
          score: weight,
          sharedCount: 1,
        });
      }
    }
    suggestions = shuffleSuggestions(
      [...map.values()]
        .sort((a, b) => b.score - a.score || b.sharedCount - a.sharedCount)
        .filter((s) => hasOverview(s.title.overview))
        .slice(0, 40)
    )
      .slice(0, 24)
      .map((s) => ({
        title: s.title,
        sharedCount: s.sharedCount,
        sampleWallets: [...s.wallets].slice(0, 3),
      }));
  }

  if (!suggestions.length) {
    suggestions = await popularSuggestions(myIds);
  }

  return {
    mode: "overlap",
    favoriteCount: favs.length,
    minFavorites: MIN_FAVORITES_FOR_DISCOVER,
    suggestions,
  };
}
