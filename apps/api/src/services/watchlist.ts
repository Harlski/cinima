import { normalizeWallet, type TitleSummary } from "@cinima/shared";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { titles, watchlist } from "../db/schema.js";
import { toTitleSummary } from "../lib/titles.js";

export async function listWatchlist(wallet: string): Promise<TitleSummary[]> {
  const w = normalizeWallet(wallet);
  const rows = await db
    .select({ title: titles })
    .from(watchlist)
    .innerJoin(titles, eq(watchlist.titleId, titles.id))
    .where(eq(watchlist.walletAddress, w))
    .orderBy(desc(watchlist.createdAt));
  return rows.map((r) => toTitleSummary(r.title));
}

export async function addToWatchlist(wallet: string, titleId: string): Promise<void> {
  const w = normalizeWallet(wallet);
  await db
    .insert(watchlist)
    .values({ walletAddress: w, titleId, createdAt: new Date() })
    .onConflictDoNothing();
}

export async function removeFromWatchlist(wallet: string, titleId: string): Promise<void> {
  const w = normalizeWallet(wallet);
  await db.delete(watchlist).where(and(eq(watchlist.walletAddress, w), eq(watchlist.titleId, titleId)));
}

export async function isOnWatchlist(wallet: string, titleId: string): Promise<boolean> {
  const w = normalizeWallet(wallet);
  const [row] = await db
    .select({ titleId: watchlist.titleId })
    .from(watchlist)
    .where(and(eq(watchlist.walletAddress, w), eq(watchlist.titleId, titleId)))
    .limit(1);
  return row != null;
}
