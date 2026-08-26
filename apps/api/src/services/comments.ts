import {
  DELETED_COMMENT_LABEL,
  normalizeCommentInput,
  normalizeWallet,
  type CommentDto,
} from "@cinima/shared";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { comments, users } from "../db/schema.js";
import { censorProfanity } from "../lib/profanity.js";

export class CommentError extends Error {
  constructor(
    readonly code: "empty_comment" | "not_found" | "forbidden" | "deleted",
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

export function toCommentDto(row: CommentRow): CommentDto {
  const deleted = row.deletedAt != null;
  return {
    id: row.id,
    walletAddress: row.walletAddress,
    handle: row.handle,
    body: deleted ? DELETED_COMMENT_LABEL : row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    deleted,
  };
}

function prepareBody(raw: string): string {
  const text = normalizeCommentInput(raw);
  if (!text) throw new CommentError("empty_comment", "Comment cannot be empty");
  return censorProfanity(text);
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

export async function listCommentsForTitle(titleId: string): Promise<CommentDto[]> {
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

  return rows.map(toCommentDto);
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
  return listCommentsForTitle(titleId);
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
  return toCommentDto(updated);
}

export async function deleteComment(wallet: string, commentId: number): Promise<CommentDto> {
  const row = await fetchCommentRow(commentId);
  if (!row) throw new CommentError("not_found", "Comment not found");
  if (row.walletAddress !== normalizeWallet(wallet)) {
    throw new CommentError("forbidden", "Not your comment");
  }
  if (row.deletedAt) return toCommentDto(row);

  const now = new Date();
  await db.update(comments).set({ deletedAt: now }).where(eq(comments.id, commentId));

  const updated = await fetchCommentRow(commentId);
  if (!updated) throw new CommentError("not_found", "Comment not found");
  return toCommentDto(updated);
}

export function commentActivityBody(row: {
  body: string;
  deletedAt: Date | null;
}): string {
  return row.deletedAt ? DELETED_COMMENT_LABEL : row.body;
}
