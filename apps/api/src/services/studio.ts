import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { makeTitleId, type MediaType, type StudioSnapshot } from "@cinima/shared";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { utcDayKey } from "./usage.js";

const RECENT_LIMIT = 20;
const PEOPLE_LIMIT = 50;
const DAY_SPAN = 14;

function startOfUtcDay(atMs = Date.now()): Date {
  const d = new Date(atMs);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysAgoStart(n: number, atMs = Date.now()): Date {
  const d = startOfUtcDay(atMs);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function iso(d: Date | null | undefined): string | null {
  if (d == null) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

async function countRows(
  from: typeof schema.users | typeof schema.favorites | typeof schema.follows | typeof schema.shareLinks,
  where?: ReturnType<typeof gte> | ReturnType<typeof eq> | ReturnType<typeof and> | ReturnType<typeof isNotNull>
): Promise<number> {
  const q = db.select({ count: sql<number>`count(*)` }).from(from);
  const [row] = where ? await q.where(where) : await q;
  return Number(row?.count || 0);
}

function personRef(
  walletAddress: string,
  handle: string | null | undefined
): { walletAddress: string; handle: string | null } {
  return { walletAddress, handle: handle ?? null };
}

export async function getStudioSnapshot(atMs = Date.now()): Promise<StudioSnapshot> {
  const today = startOfUtcDay(atMs);
  const week = daysAgoStart(6, atMs);
  const todayKey = utcDayKey(atMs);
  const weekStartKey = utcDayKey(week.getTime());

  const [
    users,
    signedUpToday,
    signedUp7d,
    favorites,
    recommends,
    follows,
    followsToday,
    shares,
    sharesToday,
  ] = await Promise.all([
    countRows(schema.users),
    countRows(schema.users, gte(schema.users.createdAt, today)),
    countRows(schema.users, gte(schema.users.createdAt, week)),
    countRows(schema.favorites),
    countRows(schema.favorites, isNotNull(schema.favorites.recommendedAt)),
    countRows(schema.follows),
    countRows(schema.follows, gte(schema.follows.createdAt, today)),
    countRows(schema.shareLinks),
    countRows(schema.shareLinks, gte(schema.shareLinks.createdAt, today)),
  ]);

  const [searchesTodayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.usageEvents)
    .where(
      and(
        eq(schema.usageEvents.kind, "search"),
        gte(schema.usageEvents.createdAt, today)
      )
    );
  const [viewsTodayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.usageEvents)
    .where(
      and(eq(schema.usageEvents.kind, "view"), gte(schema.usageEvents.createdAt, today))
    );

  const [activeTodayRow] = await db
    .select({
      people: sql<number>`count(*)`,
      ms: sql<number>`coalesce(sum(${schema.presenceDays.activeMs}), 0)`,
    })
    .from(schema.presenceDays)
    .where(
      and(eq(schema.presenceDays.day, todayKey), gte(schema.presenceDays.activeMs, 1))
    );

  const [active7dRow] = await db
    .select({ people: sql<number>`count(distinct ${schema.presenceDays.walletAddress})` })
    .from(schema.presenceDays)
    .where(
      and(gte(schema.presenceDays.day, weekStartKey), gte(schema.presenceDays.activeMs, 1))
    );

  const signupRows = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', ${schema.users.createdAt} / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(schema.users)
    .where(gte(schema.users.createdAt, daysAgoStart(DAY_SPAN - 1, atMs)))
    .groupBy(sql`strftime('%Y-%m-%d', ${schema.users.createdAt} / 1000, 'unixepoch')`);

  const signupMap = new Map(signupRows.map((r) => [r.date, Number(r.count || 0)]));
  const signupsByDay = [];
  for (let i = DAY_SPAN - 1; i >= 0; i--) {
    const date = utcDayKey(daysAgoStart(i, atMs).getTime());
    signupsByDay.push({ date, count: signupMap.get(date) ?? 0 });
  }

  const recentUserRows = await db
    .select({
      walletAddress: schema.users.walletAddress,
      handle: schema.users.handle,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt))
    .limit(RECENT_LIMIT);

  const searchRows = await db
    .select({
      query: schema.usageEvents.query,
      walletAddress: schema.usageEvents.walletAddress,
      createdAt: schema.usageEvents.createdAt,
      handle: schema.users.handle,
    })
    .from(schema.usageEvents)
    .leftJoin(schema.users, eq(schema.users.walletAddress, schema.usageEvents.walletAddress))
    .where(eq(schema.usageEvents.kind, "search"))
    .orderBy(desc(schema.usageEvents.createdAt))
    .limit(RECENT_LIMIT);

  const viewRows = await db
    .select({
      titleId: schema.usageEvents.titleId,
      walletAddress: schema.usageEvents.walletAddress,
      createdAt: schema.usageEvents.createdAt,
      handle: schema.users.handle,
      title: schema.titles.title,
    })
    .from(schema.usageEvents)
    .leftJoin(schema.users, eq(schema.users.walletAddress, schema.usageEvents.walletAddress))
    .leftJoin(schema.titles, eq(schema.titles.id, schema.usageEvents.titleId))
    .where(eq(schema.usageEvents.kind, "view"))
    .orderBy(desc(schema.usageEvents.createdAt))
    .limit(RECENT_LIMIT);

  const shareRows = await db
    .select({
      kind: schema.shareLinks.kind,
      handle: schema.shareLinks.handle,
      walletAddress: schema.shareLinks.walletAddress,
      mediaType: schema.shareLinks.mediaType,
      tmdbId: schema.shareLinks.tmdbId,
      createdAt: schema.shareLinks.createdAt,
    })
    .from(schema.shareLinks)
    .orderBy(desc(schema.shareLinks.createdAt))
    .limit(RECENT_LIMIT);

  const followRows = await db
    .select({
      followerWallet: schema.follows.followerWallet,
      followeeWallet: schema.follows.followeeWallet,
      createdAt: schema.follows.createdAt,
    })
    .from(schema.follows)
    .orderBy(desc(schema.follows.createdAt))
    .limit(RECENT_LIMIT);

  const followWallets = [
    ...new Set(followRows.flatMap((r) => [r.followerWallet, r.followeeWallet])),
  ];
  const followHandles =
    followWallets.length === 0
      ? []
      : await db
          .select({
            walletAddress: schema.users.walletAddress,
            handle: schema.users.handle,
          })
          .from(schema.users)
          .where(inArray(schema.users.walletAddress, followWallets));
  const handleByWallet = new Map(followHandles.map((u) => [u.walletAddress, u.handle]));

  const topSearchRows = await db
    .select({
      query: schema.usageEvents.query,
      count: sql<number>`count(*)`,
    })
    .from(schema.usageEvents)
    .where(
      and(eq(schema.usageEvents.kind, "search"), gte(schema.usageEvents.createdAt, week))
    )
    .groupBy(schema.usageEvents.query)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const topViewRows = await db
    .select({
      titleId: schema.usageEvents.titleId,
      title: schema.titles.title,
      count: sql<number>`count(*)`,
    })
    .from(schema.usageEvents)
    .leftJoin(schema.titles, eq(schema.titles.id, schema.usageEvents.titleId))
    .where(and(eq(schema.usageEvents.kind, "view"), gte(schema.usageEvents.createdAt, week)))
    .groupBy(schema.usageEvents.titleId, schema.titles.title)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const topShareRows = await db
    .select({
      mediaType: schema.shareLinks.mediaType,
      tmdbId: schema.shareLinks.tmdbId,
      count: sql<number>`count(*)`,
    })
    .from(schema.shareLinks)
    .where(and(eq(schema.shareLinks.kind, "title"), gte(schema.shareLinks.createdAt, week)))
    .groupBy(schema.shareLinks.mediaType, schema.shareLinks.tmdbId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const titleIds = topShareRows
    .map((r) =>
      r.mediaType && r.tmdbId
        ? makeTitleId(r.mediaType as MediaType, r.tmdbId)
        : null
    )
    .filter((id): id is NonNullable<typeof id> => id != null);
  const shareTitles =
    titleIds.length === 0
      ? []
      : await db
          .select({ id: schema.titles.id, title: schema.titles.title })
          .from(schema.titles)
          .where(inArray(schema.titles.id, titleIds));
  const titleNameById = new Map(shareTitles.map((t) => [t.id, t.title]));

  const recentShareTitleIds = shareRows
    .map((r) =>
      r.kind === "title" && r.mediaType && r.tmdbId
        ? makeTitleId(r.mediaType as MediaType, r.tmdbId)
        : null
    )
    .filter((id): id is NonNullable<typeof id> => id != null);
  const recentShareTitles =
    recentShareTitleIds.length === 0
      ? []
      : await db
          .select({ id: schema.titles.id, title: schema.titles.title })
          .from(schema.titles)
          .where(inArray(schema.titles.id, recentShareTitleIds));
  for (const t of recentShareTitles) titleNameById.set(t.id, t.title);

  const userRows = await db
    .select({
      walletAddress: schema.users.walletAddress,
      handle: schema.users.handle,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt))
    .limit(PEOPLE_LIMIT);

  const wallets = userRows.map((u) => u.walletAddress);

  const favoriteCounts =
    wallets.length === 0
      ? []
      : await db
          .select({
            walletAddress: schema.favorites.walletAddress,
            count: sql<number>`count(*)`,
          })
          .from(schema.favorites)
          .where(inArray(schema.favorites.walletAddress, wallets))
          .groupBy(schema.favorites.walletAddress);

  const followingCounts =
    wallets.length === 0
      ? []
      : await db
          .select({
            walletAddress: schema.follows.followerWallet,
            count: sql<number>`count(*)`,
          })
          .from(schema.follows)
          .where(inArray(schema.follows.followerWallet, wallets))
          .groupBy(schema.follows.followerWallet);

  const followerCounts =
    wallets.length === 0
      ? []
      : await db
          .select({
            walletAddress: schema.follows.followeeWallet,
            count: sql<number>`count(*)`,
          })
          .from(schema.follows)
          .where(inArray(schema.follows.followeeWallet, wallets))
          .groupBy(schema.follows.followeeWallet);

  const presenceRows =
    wallets.length === 0
      ? []
      : await db
          .select({
            walletAddress: schema.presenceDays.walletAddress,
            activeMs: sql<number>`coalesce(sum(${schema.presenceDays.activeMs}), 0)`,
            lastActiveAt: sql<number>`max(${schema.presenceDays.lastHeartbeatAt})`,
          })
          .from(schema.presenceDays)
          .where(
            and(
              gte(schema.presenceDays.day, weekStartKey),
              inArray(schema.presenceDays.walletAddress, wallets)
            )
          )
          .groupBy(schema.presenceDays.walletAddress);

  const favMap = new Map(favoriteCounts.map((r) => [r.walletAddress, Number(r.count || 0)]));
  const followingMap = new Map(
    followingCounts.map((r) => [r.walletAddress, Number(r.count || 0)])
  );
  const followerMap = new Map(
    followerCounts.map((r) => [r.walletAddress, Number(r.count || 0)])
  );
  const presenceMap = new Map(
    presenceRows.map((r) => [
      r.walletAddress,
      {
        activeMs7d: Number(r.activeMs || 0),
        lastActiveAt: r.lastActiveAt ? new Date(r.lastActiveAt).toISOString() : null,
      },
    ])
  );

  return {
    totals: {
      users,
      signedUpToday,
      signedUp7d,
      activeToday: Number(activeTodayRow?.people || 0),
      active7d: Number(active7dRow?.people || 0),
      activeMsToday: Number(activeTodayRow?.ms || 0),
      searchesToday: Number(searchesTodayRow?.count || 0),
      viewsToday: Number(viewsTodayRow?.count || 0),
      shares,
      sharesToday,
      follows,
      followsToday,
      favorites,
      recommends,
    },
    signupsByDay,
    recentSignups: recentUserRows.map((u) => ({
      ...personRef(u.walletAddress, u.handle),
      createdAt: iso(u.createdAt)!,
    })),
    recentSearches: searchRows
      .filter((r) => r.query)
      .map((r) => ({
        ...personRef(r.walletAddress, r.handle),
        query: r.query!,
        createdAt: iso(r.createdAt)!,
      })),
    recentViews: viewRows
      .filter((r) => r.titleId)
      .map((r) => ({
        ...personRef(r.walletAddress, r.handle),
        titleId: r.titleId!,
        title: r.title ?? null,
        createdAt: iso(r.createdAt)!,
      })),
    recentShares: shareRows.map((r) => {
      const titleId =
        r.kind === "title" && r.mediaType && r.tmdbId
          ? makeTitleId(r.mediaType as MediaType, r.tmdbId)
          : null;
      return {
        ...personRef(r.walletAddress, r.handle),
        kind: r.kind as "title" | "profile",
        titleId,
        title: titleId ? titleNameById.get(titleId) ?? null : null,
        createdAt: iso(r.createdAt)!,
      };
    }),
    recentFollows: followRows.map((r) => ({
      follower: personRef(r.followerWallet, handleByWallet.get(r.followerWallet)),
      followee: personRef(r.followeeWallet, handleByWallet.get(r.followeeWallet)),
      createdAt: iso(r.createdAt)!,
    })),
    topSearches: topSearchRows
      .filter((r) => r.query)
      .map((r) => ({ query: r.query!, count: Number(r.count || 0) })),
    topViews: topViewRows
      .filter((r) => r.titleId)
      .map((r) => ({
        titleId: r.titleId!,
        title: r.title ?? null,
        count: Number(r.count || 0),
      })),
    topShares: topShareRows
      .filter((r) => r.mediaType && r.tmdbId)
      .map((r) => {
        const titleId = makeTitleId(r.mediaType as MediaType, r.tmdbId!);
        return {
          titleId,
          title: titleNameById.get(titleId) ?? null,
          count: Number(r.count || 0),
        };
      }),
    people: userRows.map((u) => {
      const presence = presenceMap.get(u.walletAddress);
      return {
        ...personRef(u.walletAddress, u.handle),
        createdAt: iso(u.createdAt)!,
        lastActiveAt: presence?.lastActiveAt ?? null,
        activeMs7d: presence?.activeMs7d ?? 0,
        favoriteCount: favMap.get(u.walletAddress) ?? 0,
        followingCount: followingMap.get(u.walletAddress) ?? 0,
        followerCount: followerMap.get(u.walletAddress) ?? 0,
      };
    }),
  };
}
