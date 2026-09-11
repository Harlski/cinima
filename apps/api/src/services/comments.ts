import {
  DELETED_COMMENT_LABEL,
  normalizeCommentInput,
  normalizeWallet,
  type CommentDto,
  type CommentFeedItem,
} from "@cinima/shared";
import { desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { commentThanks, comments, titles, users } from "../db/schema.js";
import { censorProfanity } from "../lib/profanity.js";
import { toTitleSummary } from "../lib/titles.js";

export class CommentError extends Error {
  constructor(
    readonly code:
      | "empty_comment"
      | "not_found"
      | "forbidden"
      | "deleted"
      | "cannot_thank_self",
    message: string
  ) {
    super(message);
    this.name = "CommentError";
  }
}

type CommentRow = {
  id: number;
  walletAddress: string;
  body: string;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  handle: string | null;
};

type ThanksMeta = { count: number; thanked: boolean };

export function toCommentDto(row: CommentRow, thanks: ThanksMeta): CommentDto {
  const deleted = row.deletedAt != null;
  return {
    id: row.id,
    walletAddress: row.walletAddress,
    handle: row.handle,
    body: deleted ? DELETED_COMMENT_LABEL : row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    deleted,
    thanksCount: thanks.count,
    thanked: thanks.thanked,
  };
}

function prepareBody(raw: string): string {
  const text = normalizeCommentInput(raw);
  if (!text) throw new CommentError("empty_comment", "Comment cannot be empty");
  return censorProfanity(text);
}

async function thanksMetaFor(
  commentIds: number[],
  viewer: string
): Promise<Map<number, ThanksMeta>> {
  const map = new Map<number, ThanksMeta>();
  for (const id of commentIds) map.set(id, { count: 0, thanked: false });
  if (!commentIds.length) return map;
  const viewerW = normalizeWallet(viewer);
  const rows = await db
    .select({
      commentId: commentThanks.commentId,
      fromWallet: commentThanks.fromWallet,
    })
    .from(commentThanks)
    .where(inArray(commentThanks.commentId, commentIds));
  for (const r of rows) {
    const cur = map.get(r.commentId) ?? { count: 0, thanked: false };
    cur.count += 1;
    if (r.fromWallet === viewerW) cur.thanked = true;
    map.set(r.commentId, cur);
  }
  return map;
}

async function fetchCommentRow(id: number): Promise<CommentRow | null> {
  const [row] = await db
    .select({
      id: comments.id,
      walletAddress: comments.walletAddress,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      deletedAt: comments.deletedAt,
      handle: users.handle,
    })
    .from(comments)
    .leftJoin(users, eq(comments.walletAddress, users.walletAddress))
    .where(eq(comments.id, id))
    .limit(1);
  return row ?? null;
}

async function toDtoForViewer(row: CommentRow, viewer: string): Promise<CommentDto> {
  const meta = await thanksMetaFor([row.id], viewer);
  return toCommentDto(row, meta.get(row.id) ?? { count: 0, thanked: false });
}

export async function listCommentsForTitle(
  titleId: string,
  viewer: string
): Promise<CommentDto[]> {
  const rows = await db
    .select({
      id: comments.id,
      walletAddress: comments.walletAddress,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      deletedAt: comments.deletedAt,
      handle: users.handle,
    })
    .from(comments)
    .leftJoin(users, eq(comments.walletAddress, users.walletAddress))
    .where(eq(comments.titleId, titleId))
    .orderBy(desc(comments.createdAt));

  const meta = await thanksMetaFor(
    rows.map((r) => r.id),
    viewer
  );
  return rows.map((row) =>
    toCommentDto(row, meta.get(row.id) ?? { count: 0, thanked: false })
  );
}

export async function listCommentFeed(
  viewer: string,
  limit = 40
): Promise<CommentFeedItem[]> {
  const rows = await db
    .select({
      id: comments.id,
      walletAddress: comments.walletAddress,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      deletedAt: comments.deletedAt,
      handle: users.handle,
      title: titles,
    })
    .from(comments)
    .innerJoin(titles, eq(comments.titleId, titles.id))
    .leftJoin(users, eq(comments.walletAddress, users.walletAddress))
    .where(isNull(comments.deletedAt))
    .orderBy(desc(comments.createdAt))
    .limit(limit);

  const meta = await thanksMetaFor(
    rows.map((r) => r.id),
    viewer
  );
  return rows.map((row) => ({
    ...toCommentDto(row, meta.get(row.id) ?? { count: 0, thanked: false }),
    title: toTitleSummary(row.title),
  }));
}

export async function createComment(
  wallet: string,
  titleId: string,
  rawBody: string
): Promise<CommentDto[]> {
  const body = prepareBody(rawBody);
  await db.insert(comments).values({
    titleId,
    walletAddress: normalizeWallet(wallet),
    body,
    txHash: "",
    createdAt: new Date(),
  });
  return listCommentsForTitle(titleId, wallet);
}

export async function updateComment(
  wallet: string,
  commentId: number,
  rawBody: string
): Promise<CommentDto> {
  const row = await fetchCommentRow(commentId);
  if (!row) throw new CommentError("not_found", "Comment not found");
  if (row.deletedAt) throw new CommentError("deleted", "Comment was deleted");
  if (row.walletAddress !== normalizeWallet(wallet)) {
    throw new CommentError("forbidden", "Not your comment");
  }

  const body = prepareBody(rawBody);
  const now = new Date();
  await db
    .update(comments)
    .set({ body, updatedAt: now })
    .where(eq(comments.id, commentId));

  const updated = await fetchCommentRow(commentId);
  if (!updated) throw new CommentError("not_found", "Comment not found");
  return toDtoForViewer(updated, wallet);
}

export async function deleteComment(wallet: string, commentId: number): Promise<CommentDto> {
  const row = await fetchCommentRow(commentId);
  if (!row) throw new CommentError("not_found", "Comment not found");
  if (row.walletAddress !== normalizeWallet(wallet)) {
    throw new CommentError("forbidden", "Not your comment");
  }
  if (row.deletedAt) return toDtoForViewer(row, wallet);

  const now = new Date();
  await db.update(comments).set({ deletedAt: now }).where(eq(comments.id, commentId));

  const updated = await fetchCommentRow(commentId);
  if (!updated) throw new CommentError("not_found", "Comment not found");
  return toDtoForViewer(updated, wallet);
}

export async function addCommentThanks(
  from: string,
  commentId: number
): Promise<{ created: boolean; id: number | null; comment: CommentDto }> {
  const row = await fetchCommentRow(commentId);
  if (!row) throw new CommentError("not_found", "Comment not found");
  if (row.deletedAt) throw new CommentError("deleted", "Comment was deleted");
  const fromWallet = normalizeWallet(from);
  if (row.walletAddress === fromWallet) {
    throw new CommentError("cannot_thank_self", "cannot_thank_self");
  }

  const inserted = await db
    .insert(commentThanks)
    .values({
      fromWallet,
      commentId,
      createdAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: commentThanks.id });

  const comment = await toDtoForViewer(row, fromWallet);
  return { created: inserted.length > 0, id: inserted[0]?.id ?? null, comment };
}

export function commentActivityBody(row: {
  body: string;
  deletedAt: Date | null;
}): string {
  return row.deletedAt ? DELETED_COMMENT_LABEL : row.body;
}
