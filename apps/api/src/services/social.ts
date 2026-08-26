import { DELETED_COMMENT_LABEL, normalizeWallet } from "@cinima/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { comments, favorites, thanks, titles, unlocks, users } from "../db/schema.js";
import { toTitleSummary } from "../lib/titles.js";
import { markLifetimeUnlocked } from "./auth.js";
import { verifyPayment } from "./payments.js";

export async function hasUnlock(wallet: string, titleId: string) {
  const w = normalizeWallet(wallet);
  const [user] = await db.select().from(users).where(eq(users.walletAddress, w)).limit(1);
  if (user?.lifetimeUnlockedAt) return true;
  const [row] = await db
    .select()
    .from(unlocks)
    .where(and(eq(unlocks.walletAddress, w), eq(unlocks.titleId, titleId)))
    .limit(1);
  return !!row;
}

export async function listUnlocks(wallet: string) {
  const w = normalizeWallet(wallet);
  const rows = await db
    .select({ title: titles })
    .from(unlocks)
    .innerJoin(titles, eq(unlocks.titleId, titles.id))
    .where(eq(unlocks.walletAddress, w))
    .orderBy(desc(unlocks.createdAt));
  return rows.map((r) => toTitleSummary(r.title));
}

export async function recordUnlock(wallet: string, titleId: string, txHash: string) {
  await verifyPayment({
    txHash,
    expectedMemoType: "unlock",
    expectedTitleId: titleId,
    payerWallet: wallet,
  });
  await db
    .insert(unlocks)
    .values({
      walletAddress: normalizeWallet(wallet),
      titleId,
      txHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();
}

export async function recordLifetime(wallet: string, txHash: string) {
  await verifyPayment({
    txHash,
    expectedMemoType: "lifetime",
    payerWallet: wallet,
  });
  await markLifetimeUnlocked(wallet);
}

export async function listComments(titleId: string) {
  const rows = await db
    .select({
      comment: comments,
      handle: users.handle,
    })
    .from(comments)
    .leftJoin(users, eq(comments.walletAddress, users.walletAddress))
    .where(eq(comments.titleId, titleId))
    .orderBy(desc(comments.createdAt))
    .limit(100);

  return rows.map((r) => ({
    id: r.comment.id,
    walletAddress: r.comment.walletAddress,
    handle: r.handle,
    body: r.comment.body,
    createdAt: r.comment.createdAt.toISOString(),
  }));
}

export async function addComment(wallet: string, titleId: string, body: string) {
  const text = body.trim().slice(0, 500);
  if (!text) throw new Error("empty_comment");
  await db.insert(comments).values({
    titleId,
    walletAddress: normalizeWallet(wallet),
    body: text,
    txHash: "",
    createdAt: new Date(),
  });
}

export async function listSuggesters(titleId: string, me: string) {
  const w = normalizeWallet(me);
  const peers = await db
    .select({
      walletAddress: favorites.walletAddress,
      handle: users.handle,
      thankedAt: thanks.createdAt,
    })
    .from(favorites)
    .leftJoin(users, eq(favorites.walletAddress, users.walletAddress))
    .leftJoin(
      thanks,
      and(
        eq(thanks.fromWallet, w),
        eq(thanks.toWallet, favorites.walletAddress),
        eq(thanks.titleId, titleId)
      )
    )
    .where(and(eq(favorites.titleId, titleId), sql`${favorites.walletAddress} != ${w}`))
    .limit(24);

  return peers.map((p) => ({
    walletAddress: p.walletAddress,
    handle: p.handle,
    thanked: p.thankedAt != null,
  }));
}

export async function addThanks(opts: {
  from: string;
  to: string;
  titleId: string;
  tipTxHash?: string | null;
}): Promise<{ created: boolean }> {
  if (opts.tipTxHash) {
    throw new Error("payments_retired");
  }
  const fromWallet = normalizeWallet(opts.from);
  const toWallet = normalizeWallet(opts.to);
  if (fromWallet === toWallet) {
    throw new Error("cannot_thank_self");
  }
  const inserted = await db
    .insert(thanks)
    .values({
      fromWallet,
      toWallet,
      titleId: opts.titleId,
      tipTxHash: opts.tipTxHash ?? null,
      createdAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: thanks.id });
  return { created: inserted.length > 0 };
}

export async function thankAllSuggesters(from: string, titleId: string) {
  const remaining = (await listSuggesters(titleId, from)).filter((s) => !s.thanked);
  if (remaining.length === 0) return 0;
  const fromWallet = normalizeWallet(from);
  const now = new Date();
  await db
    .insert(thanks)
    .values(
      remaining.map((s) => ({
        fromWallet,
        toWallet: normalizeWallet(s.walletAddress),
        titleId,
        tipTxHash: null,
        createdAt: now,
      }))
    )
    .onConflictDoNothing();
  return remaining.length;
}

export async function activityFeed(limit = 40) {
  const recentComments = await db
    .select({
      c: comments,
      handle: users.handle,
      titleName: titles.title,
    })
    .from(comments)
    .leftJoin(users, eq(comments.walletAddress, users.walletAddress))
    .leftJoin(titles, eq(comments.titleId, titles.id))
    .orderBy(desc(comments.createdAt))
    .limit(limit);

  const recentThanks = await db
    .select({
      t: thanks,
      fromHandle: users.handle,
      titleName: titles.title,
    })
    .from(thanks)
    .leftJoin(users, eq(thanks.fromWallet, users.walletAddress))
    .leftJoin(titles, eq(thanks.titleId, titles.id))
    .orderBy(desc(thanks.createdAt))
    .limit(limit);

  const recentUnlocks = await db
    .select({
      u: unlocks,
      handle: users.handle,
      titleName: titles.title,
    })
    .from(unlocks)
    .leftJoin(users, eq(unlocks.walletAddress, users.walletAddress))
    .leftJoin(titles, eq(unlocks.titleId, titles.id))
    .orderBy(desc(unlocks.createdAt))
    .limit(limit);

  const items = [
    ...recentComments.map((r) => ({
      type: "comment" as const,
      id: r.c.id,
      titleId: r.c.titleId,
      titleName: r.titleName ?? r.c.titleId,
      walletAddress: r.c.walletAddress,
      handle: r.handle,
      body: r.c.deletedAt ? DELETED_COMMENT_LABEL : r.c.body,
      createdAt: r.c.createdAt.toISOString(),
    })),
    ...recentThanks.map((r) => ({
      type: "thanks" as const,
      id: r.t.id,
      titleId: r.t.titleId,
      titleName: r.titleName ?? r.t.titleId,
      fromWallet: r.t.fromWallet,
      fromHandle: r.fromHandle,
      toWallet: r.t.toWallet,
      createdAt: r.t.createdAt.toISOString(),
      tipped: !!r.t.tipTxHash,
    })),
    ...recentUnlocks.map((r) => ({
      type: "unlock" as const,
      id: r.u.id,
      titleId: r.u.titleId,
      titleName: r.titleName ?? r.u.titleId,
      walletAddress: r.u.walletAddress,
      handle: r.handle,
      createdAt: r.u.createdAt.toISOString(),
    })),
  ];

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items.slice(0, limit);
}
