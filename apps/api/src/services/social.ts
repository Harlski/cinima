import { normalizeWallet } from "@nimcharts/shared";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { comments, thanks, titles, unlocks, users } from "../db/schema.js";
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

export async function addComment(wallet: string, titleId: string, body: string, txHash: string) {
  const text = body.trim().slice(0, 500);
  if (!text) throw new Error("empty_comment");
  await verifyPayment({
    txHash,
    expectedMemoType: "comment",
    expectedTitleId: titleId,
    payerWallet: wallet,
  });
  await db.insert(comments).values({
    titleId,
    walletAddress: normalizeWallet(wallet),
    body: text,
    txHash,
    createdAt: new Date(),
  });
}

export async function addThanks(opts: {
  from: string;
  to: string;
  titleId: string;
  tipTxHash?: string | null;
}) {
  if (opts.tipTxHash) {
    await verifyPayment({
      txHash: opts.tipTxHash,
      expectedMemoType: "thanks",
      expectedTo: opts.to,
      payerWallet: opts.from,
      minLuna: 1,
    });
  }
  await db.insert(thanks).values({
    fromWallet: normalizeWallet(opts.from),
    toWallet: normalizeWallet(opts.to),
    titleId: opts.titleId,
    tipTxHash: opts.tipTxHash ?? null,
    createdAt: new Date(),
  });
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
      body: r.c.body,
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
