import {
  JOIN_GRANT_LUNA,
  JOIN_GRANT_MEMO,
  joinGrantIdempotencyKey,
  normalizeWallet,
  shouldAwardJoinedTheCrew,
} from "@cinima/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { achievements, sends, users } from "../db/schema.js";
import { nimPayoutsPaused } from "./payouts.js";
import { enqueueSend } from "./sends.js";

const PAYOUTS_PAUSED_ERROR = "payouts_paused";

export async function grantJoinIfNeeded(
  walletRaw: string,
  opts: { returning: boolean; at?: Date }
): Promise<{ granted: boolean; overlay: boolean }> {
  const wallet = normalizeWallet(walletRaw);
  if (!wallet) {
    return { granted: false, overlay: false };
  }

  const [user] = await db.select().from(users).where(eq(users.walletAddress, wallet)).limit(1);
  if (!user) return { granted: false, overlay: false };

  const at = opts.at ?? new Date();
  const key = joinGrantIdempotencyKey(wallet);
  const [existing] = await db
    .select({ id: sends.id })
    .from(sends)
    .where(eq(sends.idempotencyKey, key))
    .limit(1);

  if (existing) {
    return { granted: false, overlay: user.joinOverlayPendingAt != null };
  }

  const paused = await nimPayoutsPaused();
  if (paused) {
    await db
      .insert(sends)
      .values({
        kind: "join",
        source: "join",
        fromWallet: null,
        toWallet: wallet,
        luna: JOIN_GRANT_LUNA,
        memo: JOIN_GRANT_MEMO,
        status: "failed",
        error: PAYOUTS_PAUSED_ERROR,
        idempotencyKey: key,
        thanksId: null,
        createdAt: at,
        attempts: 0,
      })
      .onConflictDoNothing();
  } else {
    const queued = await enqueueSend({
      kind: "join",
      source: "join",
      toWallet: wallet,
      luna: JOIN_GRANT_LUNA,
      memo: JOIN_GRANT_MEMO,
      idempotencyKey: key,
      at,
    });
    if (!queued.queued) {
      return { granted: false, overlay: user.joinOverlayPendingAt != null };
    }
  }

  await awardJoinedTheCrew(wallet, at);

  if (opts.returning) {
    await db
      .update(users)
      .set({ joinOverlayPendingAt: at })
      .where(eq(users.walletAddress, wallet));
  }

  return { granted: !paused, overlay: opts.returning };
}

async function awardJoinedTheCrew(wallet: string, at: Date): Promise<void> {
  const earnedKinds = await db
    .select({ kind: achievements.kind })
    .from(achievements)
    .where(eq(achievements.walletAddress, wallet));
  const hasJoined = earnedKinds.some((row) => row.kind === "joined-the-crew");

  if (shouldAwardJoinedTheCrew({ alreadyEarned: hasJoined })) {
    try {
      await db.insert(achievements).values({
        walletAddress: wallet,
        kind: "joined-the-crew",
        earnedAt: at,
        seenAt: null,
      });
    } catch {
      /* unique */
    }
  }
}

export async function ackJoinOverlay(walletRaw: string): Promise<void> {
  const wallet = normalizeWallet(walletRaw);
  if (!wallet) return;
  const now = new Date();
  await db
    .update(users)
    .set({ joinOverlayPendingAt: null })
    .where(eq(users.walletAddress, wallet));
  await db
    .update(achievements)
    .set({ seenAt: now })
    .where(and(eq(achievements.walletAddress, wallet), eq(achievements.kind, "joined-the-crew")));
}

export async function joinOverlayIsPending(walletRaw: string): Promise<boolean> {
  const wallet = normalizeWallet(walletRaw);
  if (!wallet) return false;
  const [user] = await db
    .select({ pending: users.joinOverlayPendingAt })
    .from(users)
    .where(eq(users.walletAddress, wallet))
    .limit(1);
  return user?.pending != null;
}
