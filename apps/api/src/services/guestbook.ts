import {
  USER_SEND_LUNA,
  guestbookNoteIdFromMemo,
  isGuestbookThanksNoteId,
  normalizeWallet,
  userSendNoteLabel,
  type GuestbookThanksNoteId,
} from "@cinima/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { guestbookThanks, users } from "../db/schema.js";
import { verifyUserSend } from "./payments.js";

function noteFromVerified(memo: string, hash: string, noteId: string): GuestbookThanksNoteId {
  const demo =
    memo === "demo-user-send" || hash.startsWith("demo:") || hash.startsWith("dev:");
  if (demo) {
    if (!isGuestbookThanksNoteId(noteId)) throw new Error("invalid_note");
    return noteId;
  }
  const fromMemo = guestbookNoteIdFromMemo(memo);
  if (!fromMemo) throw new Error("memo_mismatch");
  return fromMemo;
}

/** Write a Guestbook thanks only after a paid profile note is verified. */
export async function addGuestbookThanks(opts: {
  from: string;
  to: string;
  txHash: string;
  noteId: string;
}): Promise<{ id: number; sendMemo: string; sendTxHash: string }> {
  const fromWallet = normalizeWallet(opts.from);
  const toWallet = normalizeWallet(opts.to);
  if (fromWallet === toWallet) throw new Error("cannot_thank_self");
  if (!isGuestbookThanksNoteId(opts.noteId)) throw new Error("invalid_note");

  const thankee = await db.query.users.findFirst({
    where: eq(users.walletAddress, toWallet),
  });
  if (!thankee) throw new Error("not_found");

  const existing = await db.query.guestbookThanks.findFirst({
    where: and(
      eq(guestbookThanks.fromWallet, fromWallet),
      eq(guestbookThanks.toWallet, toWallet)
    ),
  });
  if (existing) throw new Error("already_thanked");

  const verified = await verifyUserSend({
    txHash: opts.txHash,
    payerWallet: fromWallet,
    toWallet,
    minLuna: USER_SEND_LUNA,
  });
  const noteId = noteFromVerified(verified.memo, verified.hash, opts.noteId);
  const sendMemo = userSendNoteLabel(noteId);
  const hash = String(opts.txHash).trim();
  const now = new Date();

  try {
    const inserted = await db
      .insert(guestbookThanks)
      .values({
        fromWallet,
        toWallet,
        sendTxHash: hash,
        sendTxAt: now,
        sendMemo,
        createdAt: now,
      })
      .returning({ id: guestbookThanks.id });
    const id = inserted[0]?.id;
    if (!id) throw new Error("thanks_failed");
    return { id, sendMemo, sendTxHash: hash };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      throw new Error("already_thanked");
    }
    throw err;
  }
}

export async function hasGuestbookThanks(from: string, to: string): Promise<boolean> {
  const fromWallet = normalizeWallet(from);
  const toWallet = normalizeWallet(to);
  if (fromWallet === toWallet) return false;
  const row = await db.query.guestbookThanks.findFirst({
    where: and(
      eq(guestbookThanks.fromWallet, fromWallet),
      eq(guestbookThanks.toWallet, toWallet)
    ),
  });
  return !!row;
}
