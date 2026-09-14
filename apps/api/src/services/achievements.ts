import { and, count, countDistinct, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import {
  achievementTitle,
  achievementsEligible,
  isTourGatedAchievement,
  orderEarnedAchievements,
  shouldMarqueeJoinedTheCrew,
  shouldAwardBravo,
  shouldAwardEncore,
  shouldAwardFullHouse,
  shouldAwardHighSeas,
  shouldAwardInTheListings,
  shouldAwardOpeningNight,
  shouldAwardPlusOne,
  shouldAwardSaveThatForLater,
  shouldAwardSeasonTicket,
  shouldAwardThatsAWrap,
  shouldAwardThatsTheOne,
  shouldAwardWhatsNext,
  shouldAwardWordOfMouth,
  type AchievementKind,
  type GuidedTourResolution,
} from "@cinima/shared";
import { db } from "../db/index.js";
import {
  achievements,
  commentThanks,
  comments,
  favorites,
  follows,
  presenceDays,
  shareLinks,
  thanks,
  titles,
  usageEvents,
  users,
  watchlist,
} from "../db/schema.js";

export type AchievementDto = {
  kind: AchievementKind;
  title: string;
  earnedAt: string;
};

async function earnedKinds(wallet: string): Promise<Set<AchievementKind>> {
  const rows = await db
    .select({ kind: achievements.kind })
    .from(achievements)
    .where(eq(achievements.walletAddress, wallet));
  return new Set(rows.map((r) => r.kind as AchievementKind));
}

async function insertIfNew(wallet: string, kind: AchievementKind, atMs: number): Promise<boolean> {
  try {
    await db.insert(achievements).values({
      walletAddress: wallet,
      kind,
      earnedAt: new Date(atMs),
      seenAt: null,
    });
    return true;
  } catch {
    return false;
  }
}

export async function achievementCount(wallet: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(achievements)
    .where(eq(achievements.walletAddress, wallet));
  return Number(row?.n || 0);
}

async function gatedAchievementCount(wallet: string): Promise<number> {
  const rows = await db
    .select({ kind: achievements.kind })
    .from(achievements)
    .where(eq(achievements.walletAddress, wallet));
  return rows.filter((r) => isTourGatedAchievement(r.kind as AchievementKind)).length;
}

export async function listCredits(wallet: string): Promise<AchievementDto[]> {
  const rows = await db
    .select()
    .from(achievements)
    .where(eq(achievements.walletAddress, wallet))
    .orderBy(desc(achievements.earnedAt));
  return rows.map((r) => ({
    kind: r.kind as AchievementKind,
    title: achievementTitle(r.kind as AchievementKind),
    earnedAt: r.earnedAt.toISOString(),
  }));
}

/** Return unseen Achievements and mark them seen. */
export async function takeUnseenAchievements(
  wallet: string,
  opts?: { sessionCreatedAt?: number }
): Promise<AchievementKind[]> {
  const rows = await db
    .select({
      kind: achievements.kind,
      earnedAt: achievements.earnedAt,
      seenAt: achievements.seenAt,
    })
    .from(achievements)
    .where(and(eq(achievements.walletAddress, wallet), sql`${achievements.seenAt} is null`))
    .orderBy(achievements.earnedAt);
  if (!rows.length) return [];

  const [user] = await db
    .select({ pending: users.joinOverlayPendingAt })
    .from(users)
    .where(eq(users.walletAddress, wallet))
    .limit(1);
  const overlayPending = user?.pending != null;
  const sessionCreatedAt = opts?.sessionCreatedAt ?? Date.now();

  const kinds: AchievementKind[] = [];
  for (const row of rows) {
    const kind = row.kind as AchievementKind;
    if (kind === "joined-the-crew") {
      if (
        !shouldMarqueeJoinedTheCrew({
          earnedAt: row.earnedAt.getTime(),
          sessionCreatedAt,
          overlayPending,
          seenAt: row.seenAt?.getTime() ?? null,
        })
      ) {
        continue;
      }
    }
    kinds.push(kind);
  }
  if (!kinds.length) return [];
  await db
    .update(achievements)
    .set({ seenAt: new Date() })
    .where(
      and(
        eq(achievements.walletAddress, wallet),
        inArray(achievements.kind, kinds),
        sql`${achievements.seenAt} is null`
      )
    );
  return kinds;
}

async function recommendCounts(wallet: string): Promise<{ total: number; movie: number; tv: number }> {
  const rows = await db
    .select({
      mediaType: titles.mediaType,
      n: count(),
    })
    .from(favorites)
    .innerJoin(titles, eq(favorites.titleId, titles.id))
    .where(and(eq(favorites.walletAddress, wallet), isNotNull(favorites.recommendedAt)))
    .groupBy(titles.mediaType);
  let movie = 0;
  let tv = 0;
  for (const row of rows) {
    if (row.mediaType === "tv") tv = Number(row.n);
    else movie = Number(row.n);
  }
  return { total: movie + tv, movie, tv };
}

function tourStatusFromUser(user: {
  guidedTourSkippedAt: Date | null;
  guidedTourCompletedAt: Date | null;
}): GuidedTourResolution {
  if (user.guidedTourCompletedAt) return "completed";
  if (user.guidedTourSkippedAt) return "skipped";
  return "never";
}

async function isEligible(wallet: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.walletAddress, wallet)).limit(1);
  if (!user) return false;
  const n = await gatedAchievementCount(wallet);
  return achievementsEligible({
    tourStatus: tourStatusFromUser(user),
    alreadyHasAchievement: n > 0,
  });
}

async function hasShareKind(wallet: string, kind: "title" | "watchlist"): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(shareLinks)
    .where(and(eq(shareLinks.walletAddress, wallet), eq(shareLinks.kind, kind)));
  return Number(row?.n || 0) > 0;
}

async function hasWatchlistAddAfterSearchOpen(wallet: string): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(watchlist)
    .innerJoin(
      usageEvents,
      and(
        eq(usageEvents.walletAddress, watchlist.walletAddress),
        eq(usageEvents.titleId, watchlist.titleId),
        eq(usageEvents.kind, "search-open"),
        sql`${usageEvents.createdAt} <= ${watchlist.createdAt}`
      )
    )
    .where(eq(watchlist.walletAddress, wallet));
  return Number(row?.n || 0) > 0;
}

async function hasRecommendAfterSearchOpen(wallet: string): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(favorites)
    .innerJoin(
      usageEvents,
      and(
        eq(usageEvents.walletAddress, favorites.walletAddress),
        eq(usageEvents.titleId, favorites.titleId),
        eq(usageEvents.kind, "search-open"),
        sql`${usageEvents.createdAt} <= ${favorites.recommendedAt}`
      )
    )
    .where(and(eq(favorites.walletAddress, wallet), isNotNull(favorites.recommendedAt)));
  return Number(row?.n || 0) > 0;
}

async function evaluatePending(wallet: string, atMs: number): Promise<AchievementKind[]> {
  const have = await earnedKinds(wallet);
  const recs = await recommendCounts(wallet);
  const earned: AchievementKind[] = [];

  if (
    shouldAwardOpeningNight({
      alreadyEarned: have.has("opening-night"),
      recommendCountAfter: recs.total,
    })
  ) {
    if (await insertIfNew(wallet, "opening-night", atMs)) earned.push("opening-night");
  }
  if (
    shouldAwardFullHouse({
      alreadyEarned: have.has("full-house"),
      movieRecommends: recs.movie,
      tvRecommends: recs.tv,
    })
  ) {
    if (await insertIfNew(wallet, "full-house", atMs)) earned.push("full-house");
  }
  if (
    shouldAwardWordOfMouth({
      alreadyEarned: have.has("word-of-mouth"),
      hasTitleShare: await hasShareKind(wallet, "title"),
    })
  ) {
    if (await insertIfNew(wallet, "word-of-mouth", atMs)) earned.push("word-of-mouth");
  }
  if (
    shouldAwardWhatsNext({
      alreadyEarned: have.has("whats-next"),
      hasWatchlistShare: await hasShareKind(wallet, "watchlist"),
    })
  ) {
    if (await insertIfNew(wallet, "whats-next", atMs)) earned.push("whats-next");
  }

  const [sentRow] = await db
    .select({ n: count() })
    .from(thanks)
    .where(eq(thanks.fromWallet, wallet));
  const [commentSentRow] = await db
    .select({ n: count() })
    .from(commentThanks)
    .where(eq(commentThanks.fromWallet, wallet));
  if (
    shouldAwardBravo({
      alreadyEarned: have.has("bravo"),
      thanksSentAfter: Number(sentRow?.n || 0) + Number(commentSentRow?.n || 0),
    })
  ) {
    if (await insertIfNew(wallet, "bravo", atMs)) earned.push("bravo");
  }

  const [receivedRow] = await db
    .select({ n: count() })
    .from(thanks)
    .where(eq(thanks.toWallet, wallet));
  const [commentReceivedRow] = await db
    .select({ n: count() })
    .from(commentThanks)
    .innerJoin(comments, eq(commentThanks.commentId, comments.id))
    .where(eq(comments.walletAddress, wallet));
  if (
    shouldAwardEncore({
      alreadyEarned: have.has("encore"),
      thanksReceivedAfter:
        Number(receivedRow?.n || 0) + Number(commentReceivedRow?.n || 0),
    })
  ) {
    if (await insertIfNew(wallet, "encore", atMs)) earned.push("encore");
  }

  const [viewRow] = await db
    .select({ n: countDistinct(usageEvents.titleId) })
    .from(usageEvents)
    .where(and(eq(usageEvents.walletAddress, wallet), eq(usageEvents.kind, "view")));
  if (
    shouldAwardHighSeas({
      alreadyEarned: have.has("high-seas"),
      uniqueTitleViews: Number(viewRow?.n || 0),
    })
  ) {
    if (await insertIfNew(wallet, "high-seas", atMs)) earned.push("high-seas");
  }

  const [presenceRow] = await db
    .select({ n: count() })
    .from(presenceDays)
    .where(and(eq(presenceDays.walletAddress, wallet), gt(presenceDays.activeMs, 0)));
  if (
    shouldAwardSeasonTicket({
      alreadyEarned: have.has("season-ticket"),
      presenceDaysWithActivity: Number(presenceRow?.n || 0),
    })
  ) {
    if (await insertIfNew(wallet, "season-ticket", atMs)) earned.push("season-ticket");
  }

  const [searchRow] = await db
    .select({ n: count() })
    .from(usageEvents)
    .where(and(eq(usageEvents.walletAddress, wallet), eq(usageEvents.kind, "search")));
  if (
    shouldAwardInTheListings({
      alreadyEarned: have.has("in-the-listings"),
      searchCountAfter: Number(searchRow?.n || 0),
    })
  ) {
    if (await insertIfNew(wallet, "in-the-listings", atMs)) earned.push("in-the-listings");
  }

  if (
    shouldAwardSaveThatForLater({
      alreadyEarned: have.has("save-that-for-later"),
      hasWatchlistAddAfterSearchOpen: await hasWatchlistAddAfterSearchOpen(wallet),
    })
  ) {
    if (await insertIfNew(wallet, "save-that-for-later", atMs)) {
      earned.push("save-that-for-later");
    }
  }

  if (
    shouldAwardThatsTheOne({
      alreadyEarned: have.has("thats-the-one"),
      hasRecommendAfterSearchOpen: await hasRecommendAfterSearchOpen(wallet),
    })
  ) {
    if (await insertIfNew(wallet, "thats-the-one", atMs)) earned.push("thats-the-one");
  }

  const [followRow] = await db
    .select({ n: count() })
    .from(follows)
    .where(eq(follows.followerWallet, wallet));
  if (
    shouldAwardPlusOne({
      alreadyEarned: have.has("plus-one"),
      followCountAfter: Number(followRow?.n || 0),
    })
  ) {
    if (await insertIfNew(wallet, "plus-one", atMs)) earned.push("plus-one");
  }

  return orderEarnedAchievements(earned);
}

async function evaluateIfEligible(wallet: string, atMs: number): Promise<AchievementKind[]> {
  if (!(await isEligible(wallet))) return [];
  return evaluatePending(wallet, atMs);
}

export async function evaluateAfterRecommend(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterTitleShare(
  wallet: string,
  _isNew: boolean,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterWatchlistShare(
  wallet: string,
  _isNew: boolean,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterThanksSent(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterThanksReceived(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterView(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterSearch(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterSearchOpen(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterWatchlistAdd(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterFollow(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterHeartbeat(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterTourSkip(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  await db
    .update(users)
    .set({ guidedTourSkippedAt: new Date(atMs) })
    .where(
      and(
        eq(users.walletAddress, wallet),
        sql`${users.guidedTourSkippedAt} is null`,
        sql`${users.guidedTourCompletedAt} is null`
      )
    );
  return evaluateIfEligible(wallet, atMs);
}

export async function evaluateAfterTourComplete(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  await db
    .update(users)
    .set({ guidedTourCompletedAt: new Date(atMs) })
    .where(and(eq(users.walletAddress, wallet), sql`${users.guidedTourCompletedAt} is null`));

  const have = await earnedKinds(wallet);
  const earned: AchievementKind[] = [];
  if (
    shouldAwardThatsAWrap({ alreadyEarned: have.has("thats-a-wrap"), tourCompleted: true }) &&
    (await insertIfNew(wallet, "thats-a-wrap", atMs))
  ) {
    earned.push("thats-a-wrap");
  }
  earned.push(...(await evaluatePending(wallet, atMs)));
  return orderEarnedAchievements(earned);
}
