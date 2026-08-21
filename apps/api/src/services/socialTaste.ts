import {
  DISCOVER_FAVORITE_WEIGHT,
  DISCOVER_RECOMMEND_WEIGHT,
  MAX_RECOMMENDS,
  MIN_FAVORITES_FOR_DISCOVER,
  normalizeWallet,
  type DiscoverResponse,
  type OverlapSuggestion,
  type TitleSummary,
} from "@nimcharts/shared";
import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { favorites, titles } from "../db/schema.js";
import { toTitleSummary } from "../lib/titles.js";

export class SocialTasteError extends Error {
  constructor(
    readonly code: "not_favorited" | "recommend_cap" | "not_recommended",
    message: string
  ) {
    super(message);
    this.name = "SocialTasteError";
  }
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
      .where(and(eq(favorites.walletAddress, w), isNotNull(favorites.recommendedAt)));
    const n = Number(countRow?.c ?? 0);
    if (n >= MAX_RECOMMENDS) {
      throw new SocialTasteError("recommend_cap", `At most ${MAX_RECOMMENDS} Recommends; remove one first`);
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

/** Taste-overlap Discover — Recommend overlap outranks plain Favorite overlap. */
export async function discoverFor(wallet: string): Promise<DiscoverResponse> {
  const w = normalizeWallet(wallet);
  const favs = await db.select().from(favorites).where(eq(favorites.walletAddress, w));

  if (favs.length < MIN_FAVORITES_FOR_DISCOVER) {
    const myIds = new Set(favs.map((f) => f.titleId));
    const candidates = await db
      .select()
      .from(titles)
      .orderBy(sql`CAST(COALESCE(imdb_rating, tmdb_rating, '0') AS REAL) DESC`)
      .limit(30);
    return {
      mode: "onboarding",
      favoriteCount: favs.length,
      minFavorites: MIN_FAVORITES_FOR_DISCOVER,
      onboardingCandidates: candidates.map(toTitleSummary).filter((t) => !myIds.has(t.id)),
    };
  }

  const myTitleIds = favs.map((f) => f.titleId);
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
    suggestions = [...map.values()]
      .sort((a, b) => b.score - a.score || b.sharedCount - a.sharedCount)
      .slice(0, 20)
      .map((s) => ({
        title: s.title,
        sharedCount: s.sharedCount,
        sampleWallets: [...s.wallets].slice(0, 3),
      }));
  }

  if (!suggestions.length) {
    const popular = await db
      .select()
      .from(titles)
      .orderBy(sql`CAST(COALESCE(imdb_rating, '0') AS REAL) DESC`)
      .limit(16);
    const mine = new Set(myTitleIds);
    suggestions = popular
      .map(toTitleSummary)
      .filter((t) => !mine.has(t.id))
      .map((title) => ({ title, sharedCount: 0, sampleWallets: [] }));
  }

  return {
    mode: "overlap",
    favoriteCount: favs.length,
    minFavorites: MIN_FAVORITES_FOR_DISCOVER,
    suggestions,
  };
}
