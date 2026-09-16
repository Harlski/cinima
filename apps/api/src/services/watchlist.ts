import {
  applyWatchlistFlingOrder,
  normalizeWallet,
  parseWatchlistLeaveReason,
  type MediaType,
  type TitleSummary,
  type WatchlistLeaveReason,
} from "@cinima/shared";
import { and, asc, desc, eq, min } from "drizzle-orm";
import { db } from "../db/index.js";
import { titles, usageEvents, watchlist, watchlistLeaves } from "../db/schema.js";
import { toTitleSummary } from "../lib/titles.js";

export class WatchlistError extends Error {
  constructor(
    readonly code:
      | "invalid_reason"
      | "too-few"
      | "not-permutation"
      | "unchanged"
      | "invalid_media",
    message: string
  ) {
    super(message);
    this.name = "WatchlistError";
  }
}

export async function listWatchlist(wallet: string): Promise<TitleSummary[]> {
  const w = normalizeWallet(wallet);
  const rows = await db
    .select({ title: titles })
    .from(watchlist)
    .innerJoin(titles, eq(watchlist.titleId, titles.id))
    .where(eq(watchlist.walletAddress, w))
    .orderBy(asc(watchlist.sortOrder), desc(watchlist.createdAt));
  return rows.map((r) => toTitleSummary(r.title));
}

export async function addToWatchlist(wallet: string, titleId: string): Promise<void> {
  const w = normalizeWallet(wallet);
  const [row] = await db
    .select({ front: min(watchlist.sortOrder) })
    .from(watchlist)
    .where(eq(watchlist.walletAddress, w));
  const sortOrder = row?.front == null ? 0 : row.front - 1;
  await db
    .insert(watchlist)
    .values({ walletAddress: w, titleId, createdAt: new Date(), sortOrder })
    .onConflictDoNothing();
  const { dropFromForYouSet } = await import("./forYou.js");
  await dropFromForYouSet(w, titleId);
}

export async function removeFromWatchlist(
  wallet: string,
  titleId: string,
  reason: WatchlistLeaveReason | null = null
): Promise<boolean> {
  const w = normalizeWallet(wallet);
  const removed = await db
    .delete(watchlist)
    .where(and(eq(watchlist.walletAddress, w), eq(watchlist.titleId, titleId)))
    .returning({ titleId: watchlist.titleId });
  if (!removed.length) return false;
  await db.insert(watchlistLeaves).values({
    walletAddress: w,
    titleId,
    reason,
    createdAt: new Date(),
  });
  return true;
}

export function parseLeaveReasonOrThrow(raw: unknown): WatchlistLeaveReason | null {
  const parsed = parseWatchlistLeaveReason(raw);
  if (!parsed.ok) throw new WatchlistError("invalid_reason", "invalid_reason");
  return parsed.reason;
}

export function parseWatchlistFlingOrThrow(raw: unknown): {
  mediaType: MediaType;
  titleIds: string[];
} {
  if (!raw || typeof raw !== "object") {
    throw new WatchlistError("invalid_media", "invalid_media");
  }
  const mediaType = (raw as { mediaType?: unknown }).mediaType;
  const titleIds = (raw as { titleIds?: unknown }).titleIds;
  if (mediaType !== "movie" && mediaType !== "tv") {
    throw new WatchlistError("invalid_media", "invalid_media");
  }
  if (!Array.isArray(titleIds) || titleIds.some((id) => typeof id !== "string")) {
    throw new WatchlistError("not-permutation", "not-permutation");
  }
  return { mediaType, titleIds };
}

export async function flingWatchlist(
  wallet: string,
  mediaType: MediaType,
  nextVisibleIds: readonly string[]
): Promise<TitleSummary[]> {
  const w = normalizeWallet(wallet);
  const rows = await db
    .select({ title: titles })
    .from(watchlist)
    .innerJoin(titles, eq(watchlist.titleId, titles.id))
    .where(eq(watchlist.walletAddress, w))
    .orderBy(asc(watchlist.sortOrder), desc(watchlist.createdAt));
  const orderedIds = rows.map((r) => r.title.id);
  const mediaById: Record<string, MediaType> = {};
  for (const row of rows) {
    mediaById[row.title.id] = row.title.mediaType as MediaType;
  }
  const result = applyWatchlistFlingOrder({
    orderedIds,
    mediaById,
    mediaType,
    nextVisibleIds,
  });
  if (!result.ok) throw new WatchlistError(result.error, result.error);

  for (let i = 0; i < result.orderedIds.length; i++) {
    const titleId = result.orderedIds[i];
    if (!titleId) continue;
    await db
      .update(watchlist)
      .set({ sortOrder: i })
      .where(and(eq(watchlist.walletAddress, w), eq(watchlist.titleId, titleId)));
  }

  await db.insert(usageEvents).values({
    walletAddress: w,
    kind: "watchlist-fling",
    query: null,
    titleId: null,
    createdAt: new Date(),
  });

  return listWatchlist(w);
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
