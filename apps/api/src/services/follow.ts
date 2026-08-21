import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { FollowingFeedItem, HeatmapDay } from "@cinima/shared";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { toTitleSummary } from "../lib/titles.js";
import { normalizeWallet } from "../lib/util.js";

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgoUtc(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export async function isFollowing(follower: string, followee: string): Promise<boolean> {
  const row = await db.query.follows.findFirst({
    where: and(
      eq(schema.follows.followerWallet, normalizeWallet(follower)),
      eq(schema.follows.followeeWallet, normalizeWallet(followee))
    ),
  });
  return !!row;
}

export async function followCounts(wallet: string) {
  const w = normalizeWallet(wallet);
  const [followers, following] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.follows)
      .where(eq(schema.follows.followeeWallet, w))
      .then((r) => Number(r[0]?.count || 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.follows)
      .where(eq(schema.follows.followerWallet, w))
      .then((r) => Number(r[0]?.count || 0)),
  ]);
  return { followerCount: followers, followingCount: following };
}

export async function followUser(follower: string, followee: string) {
  const a = normalizeWallet(follower);
  const b = normalizeWallet(followee);
  if (a === b) throw new Error("cannot_follow_self");
  await db
    .insert(schema.follows)
    .values({ followerWallet: a, followeeWallet: b, createdAt: new Date() })
    .onConflictDoNothing();
}

export async function unfollowUser(follower: string, followee: string) {
  await db
    .delete(schema.follows)
    .where(
      and(
        eq(schema.follows.followerWallet, normalizeWallet(follower)),
        eq(schema.follows.followeeWallet, normalizeWallet(followee))
      )
    );
}

/** Contribution counts per UTC day for the last `dayCount` days (GitHub-style). */
export async function activityHeatmap(wallet: string, dayCount = 371): Promise<HeatmapDay[]> {
  const w = normalizeWallet(wallet);
  const start = daysAgoUtc(dayCount - 1);
  const counts = new Map<string, number>();

  const bump = (createdAt: Date | number | null | undefined) => {
    if (createdAt == null) return;
    const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
    if (Number.isNaN(d.getTime()) || d < start) return;
    const key = utcDateKey(d);
    counts.set(key, (counts.get(key) || 0) + 1);
  };

  const [favs, unlocks, comments, thanksGiven] = await Promise.all([
    db
      .select({ createdAt: schema.favorites.createdAt })
      .from(schema.favorites)
      .where(and(eq(schema.favorites.walletAddress, w), gte(schema.favorites.createdAt, start))),
    db
      .select({ createdAt: schema.unlocks.createdAt })
      .from(schema.unlocks)
      .where(and(eq(schema.unlocks.walletAddress, w), gte(schema.unlocks.createdAt, start))),
    db
      .select({ createdAt: schema.comments.createdAt })
      .from(schema.comments)
      .where(and(eq(schema.comments.walletAddress, w), gte(schema.comments.createdAt, start))),
    db
      .select({ createdAt: schema.thanks.createdAt })
      .from(schema.thanks)
      .where(and(eq(schema.thanks.fromWallet, w), gte(schema.thanks.createdAt, start))),
  ]);

  for (const r of favs) bump(r.createdAt);
  for (const r of unlocks) bump(r.createdAt);
  for (const r of comments) bump(r.createdAt);
  for (const r of thanksGiven) bump(r.createdAt);

  const out: HeatmapDay[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = daysAgoUtc(dayCount - 1 - i);
    const date = utcDateKey(d);
    out.push({ date, count: counts.get(date) || 0 });
  }
  return out;
}

/** Recent favorites/unlocks from accounts the user follows. */
export async function followingFeed(follower: string, limit = 40): Promise<FollowingFeedItem[]> {
  const me = normalizeWallet(follower);
  const followees = await db
    .select({ wallet: schema.follows.followeeWallet })
    .from(schema.follows)
    .where(eq(schema.follows.followerWallet, me));
  const wallets = followees.map((f) => f.wallet);
  if (!wallets.length) return [];

  const [favRows, unlockRows] = await Promise.all([
    db
      .select({
        walletAddress: schema.favorites.walletAddress,
        createdAt: schema.favorites.createdAt,
        handle: schema.users.handle,
        title: schema.titles,
      })
      .from(schema.favorites)
      .innerJoin(schema.titles, eq(schema.favorites.titleId, schema.titles.id))
      .leftJoin(schema.users, eq(schema.favorites.walletAddress, schema.users.walletAddress))
      .where(inArray(schema.favorites.walletAddress, wallets))
      .orderBy(desc(schema.favorites.createdAt))
      .limit(limit),
    db
      .select({
        walletAddress: schema.unlocks.walletAddress,
        createdAt: schema.unlocks.createdAt,
        handle: schema.users.handle,
        title: schema.titles,
      })
      .from(schema.unlocks)
      .innerJoin(schema.titles, eq(schema.unlocks.titleId, schema.titles.id))
      .leftJoin(schema.users, eq(schema.unlocks.walletAddress, schema.users.walletAddress))
      .where(inArray(schema.unlocks.walletAddress, wallets))
      .orderBy(desc(schema.unlocks.createdAt))
      .limit(limit),
  ]);

  const items: FollowingFeedItem[] = [
    ...favRows.map((r) => ({
      type: "favorite" as const,
      walletAddress: r.walletAddress,
      handle: r.handle,
      title: toTitleSummary(r.title),
      createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
    })),
    ...unlockRows.map((r) => ({
      type: "unlock" as const,
      walletAddress: r.walletAddress,
      handle: r.handle,
      title: toTitleSummary(r.title),
      createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
    })),
  ];

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items.slice(0, limit);
}
