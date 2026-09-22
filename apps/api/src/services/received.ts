import {
  JOIN_GRANT_NIM,
  REWARD_NIM,
  USER_SEND_NIM,
  groupDigestThankers,
  isReturnPresence,
  normalizeWallet,
  type DigestThankerHit,
  type ReceivedItem,
  type ReturnDigest,
} from "@cinima/shared";
import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { commentThanks, comments, guestbookThanks, sends, thanks, titles, users } from "../db/schema.js";
import { lastPresenceAt } from "./sends.js";
import { HEARTBEAT_MAX_GAP_MS } from "./usage.js";

function previewComment(body: string): string {
  const text = String(body ?? "").trim();
  if (text.length <= 80) return text;
  return `${text.slice(0, 79)}…`;
}

function digestHitFromThanks(
  row: {
    fromWallet: string;
    fromHandle: string | null;
    titleId: string;
    titleName: string | null;
    createdAt: Date;
    sendTxAt: Date | null;
    sendTxHash: string | null;
  },
  sinceMs: number,
  rewardNim: number,
  sendNim: number
): DigestThankerHit | null {
  const createdAt = row.createdAt.getTime();
  const sendAt = row.sendTxAt?.getTime() ?? 0;
  const thanksNew = createdAt > sinceMs;
  const sendNew = Boolean(row.sendTxHash) && sendAt > sinceMs;
  if (!thanksNew && !sendNew) return null;
  const nim = thanksNew ? rewardNim + sendNim : sendNim;
  return {
    walletAddress: row.fromWallet,
    handle: row.fromHandle,
    titleId: row.titleId,
    titleName: row.titleName ?? row.titleId,
    nim,
    at: Math.max(thanksNew ? createdAt : 0, sendNew ? sendAt : 0),
  };
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

  const guestbookRows = await db
    .select({
      id: guestbookThanks.id,
      fromWallet: guestbookThanks.fromWallet,
      fromHandle: users.handle,
      sendMemo: guestbookThanks.sendMemo,
      createdAt: guestbookThanks.createdAt,
      sendTxHash: guestbookThanks.sendTxHash,
    })
    .from(guestbookThanks)
    .leftJoin(users, eq(guestbookThanks.fromWallet, users.walletAddress))
    .where(eq(guestbookThanks.toWallet, wallet))
    .orderBy(desc(guestbookThanks.createdAt))
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
    ...guestbookRows.map((r) => ({
      kind: "guestbook" as const,
      id: r.id,
      fromWallet: r.fromWallet,
      fromHandle: r.fromHandle,
      sendMemo: r.sendMemo,
      createdAt: r.createdAt.toISOString(),
      sendTxHash: r.sendTxHash,
      rewardNim: 0 as const,
      sendNim: USER_SEND_NIM,
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

  const sinceMs = since.getTime();

  const titleRows = await db
    .select({
      fromWallet: thanks.fromWallet,
      fromHandle: users.handle,
      titleId: thanks.titleId,
      titleName: titles.title,
      createdAt: thanks.createdAt,
      sendTxAt: thanks.sendTxAt,
      sendTxHash: thanks.sendTxHash,
      rewardTxHash: thanks.tipTxHash,
    })
    .from(thanks)
    .leftJoin(users, eq(thanks.fromWallet, users.walletAddress))
    .leftJoin(titles, eq(thanks.titleId, titles.id))
    .where(
      and(
        eq(thanks.toWallet, wallet),
        or(
          gt(thanks.createdAt, since),
          and(sql`${thanks.sendTxHash} is not null`, gt(thanks.sendTxAt, since))
        )
      )
    );

  const commentRows = await db
    .select({
      fromWallet: commentThanks.fromWallet,
      fromHandle: users.handle,
      titleId: comments.titleId,
      titleName: titles.title,
      createdAt: commentThanks.createdAt,
      sendTxAt: commentThanks.sendTxAt,
      sendTxHash: commentThanks.sendTxHash,
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
    .where(
      and(
        eq(comments.walletAddress, wallet),
        or(
          gt(commentThanks.createdAt, since),
          and(sql`${commentThanks.sendTxHash} is not null`, gt(commentThanks.sendTxAt, since))
        )
      )
    );

  const guestbookDigestRows = await db
    .select({
      id: guestbookThanks.id,
      fromWallet: guestbookThanks.fromWallet,
      fromHandle: users.handle,
      sendMemo: guestbookThanks.sendMemo,
      createdAt: guestbookThanks.createdAt,
    })
    .from(guestbookThanks)
    .leftJoin(users, eq(guestbookThanks.fromWallet, users.walletAddress))
    .where(and(eq(guestbookThanks.toWallet, wallet), gt(guestbookThanks.createdAt, since)));

  const hits: DigestThankerHit[] = [];
  for (const r of titleRows) {
    const hit = digestHitFromThanks(
      r,
      sinceMs,
      r.rewardTxHash ? REWARD_NIM : 0,
      r.sendTxHash ? USER_SEND_NIM : 0
    );
    if (hit) hits.push(hit);
  }
  for (const r of commentRows) {
    const hit = digestHitFromThanks(
      r,
      sinceMs,
      r.rewardStatus === "sent" && r.rewardTxHash ? REWARD_NIM : 0,
      r.sendTxHash ? USER_SEND_NIM : 0
    );
    if (hit) hits.push(hit);
  }
  for (const r of guestbookDigestRows) {
    hits.push({
      walletAddress: r.fromWallet,
      handle: r.fromHandle,
      titleId: `guestbook:${r.id}`,
      titleName: r.sendMemo,
      nim: USER_SEND_NIM,
      at: r.createdAt.getTime(),
    });
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

  const thanksCount =
    titleRows.filter((r) => r.createdAt.getTime() > sinceMs).length +
    commentRows.filter((r) => r.createdAt.getTime() > sinceMs).length +
    guestbookDigestRows.length;
  const userSends =
    Number(extraTitleSends[0]?.n || 0) +
    Number(extraCommentSends[0]?.n || 0) +
    guestbookDigestRows.length;
  const nimReceived = Number(rewardRow?.n || 0) * REWARD_NIM + userSends * USER_SEND_NIM;

  return {
    thanksCount,
    nimReceived,
    thankers: groupDigestThankers(hits),
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
