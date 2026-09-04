import { and, count, countDistinct, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import {
  achievementTitle,
  shouldAwardBravo,
  shouldAwardEncore,
  shouldAwardFullHouse,
  shouldAwardHighSeas,
  shouldAwardOpeningNight,
  shouldAwardSeasonTicket,
  shouldAwardThatsAWrap,
  shouldAwardWhatsNext,
  shouldAwardWordOfMouth,
  type AchievementKind,
} from "@cinima/shared";
import { db } from "../db/index.js";
import { achievements, favorites, presenceDays, thanks, titles, usageEvents } from "../db/schema.js";

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
export async function takeUnseenAchievements(wallet: string): Promise<AchievementKind[]> {
  const rows = await db
    .select({ kind: achievements.kind })
    .from(achievements)
    .where(and(eq(achievements.walletAddress, wallet), sql`${achievements.seenAt} is null`))
    .orderBy(achievements.earnedAt);
  const kinds = rows.map((r) => r.kind as AchievementKind);
  if (!kinds.length) return [];
  await db
    .update(achievements)
    .set({ seenAt: new Date() })
    .where(and(eq(achievements.walletAddress, wallet), sql`${achievements.seenAt} is null`));
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

export async function evaluateAfterRecommend(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  const have = await earnedKinds(wallet);
  const recs = await recommendCounts(wallet);
  const earned: AchievementKind[] = [];
  if (
    shouldAwardOpeningNight({ alreadyEarned: have.has("opening-night"), recommendCountAfter: recs.total })
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
  return earned;
}

export async function evaluateAfterTitleShare(
  wallet: string,
  isNew: boolean,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  const have = await earnedKinds(wallet);
  if (
    shouldAwardWordOfMouth({ alreadyEarned: have.has("word-of-mouth"), isNewTitleShare: isNew }) &&
    (await insertIfNew(wallet, "word-of-mouth", atMs))
  ) {
    return ["word-of-mouth"];
  }
  return [];
}

export async function evaluateAfterWatchlistShare(
  wallet: string,
  isNew: boolean,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  const have = await earnedKinds(wallet);
  if (
    shouldAwardWhatsNext({ alreadyEarned: have.has("whats-next"), isNewWatchlistShare: isNew }) &&
    (await insertIfNew(wallet, "whats-next", atMs))
  ) {
    return ["whats-next"];
  }
  return [];
}

export async function evaluateAfterThanksSent(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  const have = await earnedKinds(wallet);
  const [row] = await db
    .select({ n: count() })
    .from(thanks)
    .where(eq(thanks.fromWallet, wallet));
  const sent = Number(row?.n || 0);
  if (
    shouldAwardBravo({ alreadyEarned: have.has("bravo"), thanksSentAfter: sent }) &&
    (await insertIfNew(wallet, "bravo", atMs))
  ) {
    return ["bravo"];
  }
  return [];
}

export async function evaluateAfterThanksReceived(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  const have = await earnedKinds(wallet);
  const [row] = await db
    .select({ n: count() })
    .from(thanks)
    .where(eq(thanks.toWallet, wallet));
  const received = Number(row?.n || 0);
  if (
    shouldAwardEncore({ alreadyEarned: have.has("encore"), thanksReceivedAfter: received }) &&
    (await insertIfNew(wallet, "encore", atMs))
  ) {
    return ["encore"];
  }
  return [];
}

export async function evaluateAfterView(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  const have = await earnedKinds(wallet);
  const [row] = await db
    .select({ n: countDistinct(usageEvents.titleId) })
    .from(usageEvents)
    .where(and(eq(usageEvents.walletAddress, wallet), eq(usageEvents.kind, "view")));
  const uniqueTitleViews = Number(row?.n || 0);
  if (
    shouldAwardHighSeas({ alreadyEarned: have.has("high-seas"), uniqueTitleViews }) &&
    (await insertIfNew(wallet, "high-seas", atMs))
  ) {
    return ["high-seas"];
  }
  return [];
}

export async function evaluateAfterHeartbeat(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  const have = await earnedKinds(wallet);
  const [row] = await db
    .select({ n: count() })
    .from(presenceDays)
    .where(and(eq(presenceDays.walletAddress, wallet), gt(presenceDays.activeMs, 0)));
  const presenceDaysWithActivity = Number(row?.n || 0);
  if (
    shouldAwardSeasonTicket({
      alreadyEarned: have.has("season-ticket"),
      presenceDaysWithActivity,
    }) &&
    (await insertIfNew(wallet, "season-ticket", atMs))
  ) {
    return ["season-ticket"];
  }
  return [];
}

export async function evaluateAfterTourComplete(
  wallet: string,
  atMs = Date.now()
): Promise<AchievementKind[]> {
  const have = await earnedKinds(wallet);
  if (
    shouldAwardThatsAWrap({ alreadyEarned: have.has("thats-a-wrap"), tourCompleted: true }) &&
    (await insertIfNew(wallet, "thats-a-wrap", atMs))
  ) {
    return ["thats-a-wrap"];
  }
  return [];
}
