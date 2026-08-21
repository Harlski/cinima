import { MEMO_PREFIX } from "./constants.js";
import { isTitleId } from "./ids.js";

export type PaymentMemo =
  | { type: "unlock"; titleId: string }
  | { type: "comment"; titleId: string }
  | { type: "lifetime" }
  | { type: "thanks"; toWallet: string };

export function encodeMemo(memo: PaymentMemo): string {
  switch (memo.type) {
    case "unlock":
      return `${MEMO_PREFIX.unlock}${memo.titleId}`;
    case "comment":
      return `${MEMO_PREFIX.comment}${memo.titleId}`;
    case "lifetime":
      return MEMO_PREFIX.lifetime;
    case "thanks":
      return `${MEMO_PREFIX.thanks}${normalizeWallet(memo.toWallet)}`;
  }
}

export function parseMemo(raw: string): PaymentMemo | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (s === MEMO_PREFIX.lifetime || s === "lifetime") {
    return { type: "lifetime" };
  }
  if (s.startsWith(MEMO_PREFIX.unlock)) {
    const titleId = s.slice(MEMO_PREFIX.unlock.length).trim();
    if (!isTitleId(titleId)) return null;
    return { type: "unlock", titleId };
  }
  if (s.startsWith(MEMO_PREFIX.comment)) {
    const titleId = s.slice(MEMO_PREFIX.comment.length).trim();
    if (!isTitleId(titleId)) return null;
    return { type: "comment", titleId };
  }
  if (s.startsWith(MEMO_PREFIX.thanks)) {
    const toWallet = normalizeWallet(s.slice(MEMO_PREFIX.thanks.length));
    if (!toWallet) return null;
    return { type: "thanks", toWallet };
  }
  return null;
}

/** Compact uppercase address without spaces */
export function normalizeWallet(addr: string): string {
  return String(addr ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

/** Group Nimiq user-friendly address every 4 chars */
export function formatWallet(addr: string): string {
  const compact = normalizeWallet(addr);
  if (!compact) return "";
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

/** Compact label when no username: NQ01..WXYZ */
export function abbreviateWallet(addr: string): string {
  const compact = normalizeWallet(addr);
  if (!compact) return "";
  if (compact.length <= 8) return compact;
  return `${compact.slice(0, 4)}..${compact.slice(-4)}`;
}

/** Prefer handle; otherwise abbreviated wallet */
export function displayName(handle: string | null | undefined, wallet: string): string {
  const h = String(handle ?? "").trim();
  if (h) return h;
  return abbreviateWallet(wallet);
}

/** IMDb title page from a TMDB external id (tt…) */
export function imdbTitleUrl(imdbId: string | null | undefined): string | null {
  const id = String(imdbId ?? "").trim();
  if (!/^tt\d+$/i.test(id)) return null;
  return `https://www.imdb.com/title/${id}/`;
}

/** Public X profile from a stored handle (no @) */
export function xProfileUrl(xHandle: string | null | undefined): string | null {
  const h = String(xHandle ?? "")
    .replace(/^@/, "")
    .trim();
  if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) return null;
  return `https://x.com/${h}`;
}

/** Alias used in docs / payment verifiers */
export const decodeMemo = parseMemo;
