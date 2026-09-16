import {
  DISCOVER_FAVORITE_WEIGHT,
  DISCOVER_RECOMMEND_WEIGHT,
  fifoForYouCandidateIds,
  type OverlapSuggestion,
  type TitleSummary,
} from "@cinima/shared";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { favorites, titles } from "../db/schema.js";
import { hasPoster, toTitleSummary } from "../lib/titles.js";
import { countTitleTastePeersForTitles } from "./social.js";

async function withTasteCounts(
  suggestions: Omit<OverlapSuggestion, "recommendCount" | "favoriteCount">[],
  wallet: string
): Promise<OverlapSuggestion[]> {
  const counts = await countTitleTastePeersForTitles(
    suggestions.map((s) => s.title.id),
    wallet
  );
  return suggestions.map((s) => {
    const c = counts.get(s.title.id) ?? { recommendCount: 0, favoriteCount: 0 };
    return { ...s, recommendCount: c.recommendCount, favoriteCount: c.favoriteCount };
  });
}

function forYouCatalogWhere(excludeIds: Set<string>) {
  const eligible = sql`${titles.posterPath} IS NOT NULL AND TRIM(${titles.posterPath}) != ''`;
  if (excludeIds.size === 0) return eligible;
  return and(eligible, notInArray(titles.id, [...excludeIds]));
}

async function popularCandidates(
  excludeIds: Set<string>,
  wallet: string
): Promise<OverlapSuggestion[]> {
  const popular = await db
    .select()
    .from(titles)
    .where(forYouCatalogWhere(excludeIds))
    .orderBy(sql`CAST(COALESCE(rating, '0') AS REAL) DESC`, titles.id)
    .limit(240);
  const base = popular
    .map(toTitleSummary)
    .map((title) => ({ title, sharedCount: 0, sampleWallets: [] as string[] }));
  return withTasteCounts(base, wallet);
}

async function overlapCandidates(
  wallet: string,
  myTitleIds: string[]
): Promise<OverlapSuggestion[]> {
  if (myTitleIds.length === 0) return [];

  const peerFavs = await db
    .select()
    .from(favorites)
    .where(and(inArray(favorites.titleId, myTitleIds), sql`${favorites.walletAddress} != ${wallet}`));

  const peerScores = new Map<string, number>();
  for (const p of peerFavs) {
    const weight = p.recommendedAt != null ? DISCOVER_RECOMMEND_WEIGHT : DISCOVER_FAVORITE_WEIGHT;
    peerScores.set(p.walletAddress, (peerScores.get(p.walletAddress) || 0) + weight);
  }
  const topPeers = [...peerScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([addr]) => addr);

  if (!topPeers.length) return [];

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

  const ranked = [...map.values()]
    .sort(
      (a, b) =>
        b.score - a.score || b.sharedCount - a.sharedCount || a.title.id.localeCompare(b.title.id)
    )
    .filter((s) => hasPoster(s.title.posterUrl))
    .slice(0, 40)
    .map((s) => ({
      title: s.title,
      sharedCount: s.sharedCount,
      sampleWallets: [...s.wallets].slice(0, 3),
    }));

  return withTasteCounts(ranked, wallet);
}

/** Taste overlap first, then popular Catalog. Skips Favorites and any extra excluded Titles. */
export async function suggestionCandidates(
  wallet: string,
  extraExclude: Iterable<string> = []
): Promise<OverlapSuggestion[]> {
  const favs = await db.select().from(favorites).where(eq(favorites.walletAddress, wallet));
  const myTitleIds = favs.map((f) => f.titleId);
  const excludeIds = new Set(myTitleIds);
  for (const id of extraExclude) excludeIds.add(id);
  const overlap = await overlapCandidates(wallet, myTitleIds);
  const popular = await popularCandidates(excludeIds, wallet);
  const byId = new Map<string, OverlapSuggestion>();
  for (const row of [...overlap, ...popular]) {
    if (!byId.has(row.title.id)) byId.set(row.title.id, row);
  }
  return fifoForYouCandidateIds(
    overlap.map((s) => s.title.id),
    popular.map((s) => s.title.id)
  ).flatMap((id) => {
    const row = byId.get(id);
    return row && hasPoster(row.title.posterUrl) ? [row] : [];
  });
}

export async function suggestionsByIds(
  ids: string[],
  wallet: string
): Promise<OverlapSuggestion[]> {
  if (ids.length === 0) return [];
  const rows = await db.select().from(titles).where(inArray(titles.id, ids));
  const byId = new Map(rows.map((row) => [row.id, toTitleSummary(row)]));
  const base = ids.flatMap((id) => {
    const title = byId.get(id);
    return title && hasPoster(title.posterUrl)
      ? [{ title, sharedCount: 0, sampleWallets: [] as string[] }]
      : [];
  });
  return withTasteCounts(base, wallet);
}
