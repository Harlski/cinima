import { MIN_FAVORITES_FOR_DISCOVER, normalizeWallet, type DiscoverResponse, type OverlapSuggestion, type TitleSummary } from "@nimcharts/shared";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { favorites, titles } from "../db/schema.js";
import { toTitleSummary } from "../lib/titles.js";

export async function listFavorites(wallet: string) {
  const w = normalizeWallet(wallet);
  const rows = await db
    .select({ title: titles })
    .from(favorites)
    .innerJoin(titles, eq(favorites.titleId, titles.id))
    .where(eq(favorites.walletAddress, w))
    .orderBy(desc(favorites.createdAt));
  return rows.map((r) => toTitleSummary(r.title));
}

export async function addFavorite(wallet: string, titleId: string) {
  const w = normalizeWallet(wallet);
  await db
    .insert(favorites)
    .values({ walletAddress: w, titleId, createdAt: new Date() })
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

export async function isFavorited(wallet: string, titleId: string) {
  const w = normalizeWallet(wallet);
  const [row] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.walletAddress, w), eq(favorites.titleId, titleId)))
    .limit(1);
  return !!row;
}

/** Taste-overlap Discover — keeps the live ranking behaviour used by the HTTP route. */
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
  for (const p of peerFavs) peerScores.set(p.walletAddress, (peerScores.get(p.walletAddress) || 0) + 1);
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

    const map = new Map<string, { title: TitleSummary; wallets: Set<string> }>();
    for (const row of their) {
      const cur = map.get(row.titles.id);
      if (cur) cur.wallets.add(row.favorites.walletAddress);
      else map.set(row.titles.id, { title: toTitleSummary(row.titles), wallets: new Set([row.favorites.walletAddress]) });
    }
    suggestions = [...map.values()]
      .map((s) => ({
        title: s.title,
        sharedCount: s.wallets.size,
        sampleWallets: [...s.wallets].slice(0, 3),
      }))
      .sort((a, b) => b.sharedCount - a.sharedCount)
      .slice(0, 20);
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
