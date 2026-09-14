import {
  DIGEST_THANKER_CAP,
  JOIN_GRANT_NIM,
  REWARD_NIM,
  USER_SEND_NIM,
  capDigestThankers,
  isReturnPresence,
  normalizeWallet,
  type ReceivedItem,
  type ReturnDigest,
} from "@cinima/shared";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { commentThanks, comments, sends, thanks, titles, users } from "../db/schema.js";
import { lastPresenceAt } from "./sends.js";
import { HEARTBEAT_MAX_GAP_MS } from "./usage.js";

function previewComment(body: string): string {
  const text = String(body ?? "").trim();
  if (text.length <= 80) return text;
  return `${text.slice(0, 79)}…`;
}

export async function listReceivedThanks(
  walletRaw: string,
  limit = 40
): Promise<ReceivedItem[]> {
  const wallet = normalizeWallet(walletRaw);

  const titleRows = await db
    .select({
      id: thanks.id,
      fromWallet: thanks.fromWallet,
      fromHandle: users.handle,
      titleId: thanks.titleId,
      titleName: titles.title,
      createdAt: thanks.createdAt,
      rewardTxHash: thanks.tipTxHash,
      sendTxHash: thanks.sendTxHash,
      sendMemo: thanks.sendMemo,
    })
    .from(thanks)
    .leftJoin(users, eq(thanks.fromWallet, users.walletAddress))
    .leftJoin(titles, eq(thanks.titleId, titles.id))
    .where(eq(thanks.toWallet, wallet))
    .orderBy(desc(thanks.createdAt))
    .limit(limit);

  const commentRows = await db
    .select({
      id: commentThanks.id,
      fromWallet: commentThanks.fromWallet,
      fromHandle: users.handle,
      titleId: comments.titleId,
      titleName: titles.title,
      commentBody: comments.body,
      createdAt: commentThanks.createdAt,
      sendTxHash: commentThanks.sendTxHash,
      sendMemo: commentThanks.sendMemo,
      rewardTxHash: sends.txHash,
      rewardStatus: sends.status,
    })
    .from(commentThanks)
    .innerJoin(comments, eq(commentThanks.commentId, comments.id))
    .leftJoin(users, eq(commentThanks.fromWallet, users.walletAddress))
    .leftJoin(titles, eq(comments.titleId, titles.id))
    .leftJoin(
      sends,
      and(
        eq(sends.idempotencyKey, sql`'reward:comment:' || ${commentThanks.id}`),
        eq(sends.kind, "reward")
      )
    )
    .where(eq(comments.walletAddress, wallet))
    .orderBy(desc(commentThanks.createdAt))
    .limit(limit);

  const joinRows = await db
    .select({
      id: sends.id,
      createdAt: sends.createdAt,
      sendTxHash: sends.txHash,
      status: sends.status,
    })
    .from(sends)
    .where(and(eq(sends.toWallet, wallet), eq(sends.source, "join")))
    .orderBy(desc(sends.createdAt))
    .limit(limit);

  const items: ReceivedItem[] = [
    ...titleRows.map((r) => ({
      kind: "title" as const,
      id: r.id,
      fromWallet: r.fromWallet,
      fromHandle: r.fromHandle,
      titleId: r.titleId,
      titleName: r.titleName ?? r.titleId,
      commentPreview: null,
      sendMemo: r.sendMemo,
      createdAt: r.createdAt.toISOString(),
      rewardTxHash: r.rewardTxHash,
      sendTxHash: r.sendTxHash,
      rewardNim: r.rewardTxHash ? REWARD_NIM : 0,
      sendNim: r.sendTxHash ? USER_SEND_NIM : 0,
    })),
    ...commentRows.map((r) => ({
      kind: "comment" as const,
      id: r.id,
      fromWallet: r.fromWallet,
      fromHandle: r.fromHandle,
      titleId: r.titleId,
      titleName: r.titleName ?? r.titleId,
      commentPreview: previewComment(r.commentBody ?? ""),
      sendMemo: r.sendMemo,
      createdAt: r.createdAt.toISOString(),
      rewardTxHash: r.rewardStatus === "sent" ? r.rewardTxHash : null,
      sendTxHash: r.sendTxHash,
      rewardNim: r.rewardStatus === "sent" && r.rewardTxHash ? REWARD_NIM : 0,
      sendNim: r.sendTxHash ? USER_SEND_NIM : 0,
    })),
    ...joinRows.map((r) => ({
      kind: "join" as const,
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      sendTxHash: r.status === "sent" ? r.sendTxHash : null,
      rewardNim: 0 as const,
      sendNim: JOIN_GRANT_NIM,
    })),
  ];

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items.slice(0, limit);
}

export async function returnDigestSince(
  walletRaw: string,
  since: Date
): Promise<ReturnDigest> {
  const wallet = normalizeWallet(walletRaw);

  const titleThanks = await db
    .select({
      fromWallet: thanks.fromWallet,
      fromHandle: users.handle,
      createdAt: thanks.createdAt,
    })
    .from(thanks)
    .leftJoin(users, eq(thanks.fromWallet, users.walletAddress))
    .where(and(eq(thanks.toWallet, wallet), gt(thanks.createdAt, since)));

  const commentThanksRows = await db
    .select({
      fromWallet: commentThanks.fromWallet,
      fromHandle: users.handle,
      createdAt: commentThanks.createdAt,
    })
    .from(commentThanks)
    .innerJoin(comments, eq(commentThanks.commentId, comments.id))
    .leftJoin(users, eq(commentThanks.fromWallet, users.walletAddress))
    .where(and(eq(comments.walletAddress, wallet), gt(commentThanks.createdAt, since)));

  const titleSends = await db
    .select({
      fromWallet: thanks.fromWallet,
      fromHandle: users.handle,
      at: thanks.sendTxAt,
    })
    .from(thanks)
    .leftJoin(users, eq(thanks.fromWallet, users.walletAddress))
    .where(
      and(
        eq(thanks.toWallet, wallet),
        sql`${thanks.sendTxHash} is not null`,
        gt(thanks.sendTxAt, since)
      )
    );

  const commentSends = await db
    .select({
      fromWallet: commentThanks.fromWallet,
      fromHandle: users.handle,
      at: commentThanks.sendTxAt,
    })
    .from(commentThanks)
    .innerJoin(comments, eq(commentThanks.commentId, comments.id))
    .leftJoin(users, eq(commentThanks.fromWallet, users.walletAddress))
    .where(
      and(
        eq(comments.walletAddress, wallet),
        sql`${commentThanks.sendTxHash} is not null`,
        gt(commentThanks.sendTxAt, since)
      )
    );

  const events = [
    ...titleThanks.map((r) => ({
      walletAddress: r.fromWallet,
      handle: r.fromHandle,
      at: r.createdAt.getTime(),
    })),
    ...commentThanksRows.map((r) => ({
      walletAddress: r.fromWallet,
      handle: r.fromHandle,
      at: r.createdAt.getTime(),
    })),
    ...titleSends.map((r) => ({
      walletAddress: r.fromWallet,
      handle: r.fromHandle,
      at: r.at?.getTime() ?? 0,
    })),
    ...commentSends.map((r) => ({
      walletAddress: r.fromWallet,
      handle: r.fromHandle,
      at: r.at?.getTime() ?? 0,
    })),
  ].sort((a, b) => b.at - a.at);

  const seen = new Set<string>();
  const thankers: { walletAddress: string; handle: string | null }[] = [];
  for (const e of events) {
    if (seen.has(e.walletAddress)) continue;
    seen.add(e.walletAddress);
    thankers.push({ walletAddress: e.walletAddress, handle: e.handle });
  }

  const [rewardRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(sends)
    .where(
      and(
        eq(sends.toWallet, wallet),
        eq(sends.kind, "reward"),
        eq(sends.status, "sent"),
        gt(sends.sentAt, since)
      )
    );

  const extraTitleSends = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(thanks)
    .where(
      and(
        eq(thanks.toWallet, wallet),
        sql`${thanks.sendTxHash} is not null`,
        gt(thanks.sendTxAt, since)
      )
    );
  const extraCommentSends = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(commentThanks)
    .innerJoin(comments, eq(commentThanks.commentId, comments.id))
    .where(
      and(
        eq(comments.walletAddress, wallet),
        sql`${commentThanks.sendTxHash} is not null`,
        gt(commentThanks.sendTxAt, since)
      )
    );

  const thanksCount = titleThanks.length + commentThanksRows.length;
  const userSends = Number(extraTitleSends[0]?.n || 0) + Number(extraCommentSends[0]?.n || 0);
  const nimReceived = Number(rewardRow?.n || 0) * REWARD_NIM + userSends * USER_SEND_NIM;

  return {
    thanksCount,
    nimReceived,
    thankers: capDigestThankers(thankers, DIGEST_THANKER_CAP),
  };
}

export async function digestForHeartbeat(
  walletRaw: string,
  previousLastAt: Date | null,
  now = new Date()
): Promise<ReturnDigest | null> {
  if (!isReturnPresence(previousLastAt?.getTime() ?? null, now.getTime(), HEARTBEAT_MAX_GAP_MS)) {
    return null;
  }
  const digest = await returnDigestSince(walletRaw, previousLastAt as Date);
  if (digest.thanksCount === 0 && digest.nimReceived === 0) return null;
  return digest;
}

export { lastPresenceAt };
