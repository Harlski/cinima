import { LUNA_PER_NIM } from "./constants.js";
import { displayName } from "./memos.js";

/** 1 NIM Reward attached to a Thanks. */
export const REWARD_NIM = 1;
export const REWARD_LUNA = REWARD_NIM * LUNA_PER_NIM;

/** One-time Join grant to a wallet for signing in. */
export const JOIN_GRANT_NIM = 10;
export const JOIN_GRANT_LUNA = JOIN_GRANT_NIM * LUNA_PER_NIM;

export const JOIN_GRANT_MEMO = "Joined Cinima";
export const JOIN_GRANT_HOW = "Joined Cinima";
export const JOIN_OVERLAY_TITLE = "Thanks for joining Cinima";
export const JOIN_OVERLAY_SUB = "Thanks for coming back!";
export const JOIN_OVERLAY_NIM_LABEL = "+10 NIM";

export function joinGrantMemo(): string {
  return JOIN_GRANT_MEMO;
}

export function joinGrantIdempotencyKey(wallet: string): string {
  return `join:${wallet}`;
}

export function shouldShowJoinOverlay(input: {
  pending: boolean;
  onboarding: boolean;
  tourActive: boolean;
}): boolean {
  if (!input.pending) return false;
  if (input.onboarding || input.tourActive) return false;
  return true;
}

/** Dust Ping; enough to surface the memo in Nimiq Pay. */
export const PING_NIM = 0.0001;
export const PING_LUNA = Math.round(PING_NIM * LUNA_PER_NIM);

/** Rewards a thanker may attach per UTC day. */
export const REWARDS_PER_DAY = 5;

/** System Pings since last Presence that make a Handle Quiet. */
export const QUIET_AFTER_SYSTEM_PINGS = 3;

export const SYSTEM_PING_LAPSE_MS = 7 * 24 * 60 * 60 * 1000;
export const SYSTEM_PING_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const SYSTEM_PING_MIN_NEW_USERS = 3;

/** Nimiq basic extra data budget. Memos are truncated to this. */
export const SEND_MEMO_MAX_BYTES = 64;

export type SendKind = "reward" | "ping" | "join";
export type SendSource = "thanks" | "system" | "creator" | "join";
export type SendStatus = "queued" | "sending" | "sent" | "failed";

export function rewardsRemainingToday(sentOrQueuedToday: number): number {
  return Math.max(0, REWARDS_PER_DAY - Math.max(0, sentOrQueuedToday));
}

export function isQuiet(systemPingsSincePresence: number): boolean {
  return systemPingsSincePresence >= QUIET_AFTER_SYSTEM_PINGS;
}

export function isLapsed(lastPresenceAt: number | null, now: number): boolean {
  if (lastPresenceAt == null) return false;
  return now - lastPresenceAt >= SYSTEM_PING_LAPSE_MS;
}

export function truncateMemo(text: string, maxBytes = SEND_MEMO_MAX_BYTES): string {
  const encoder = new TextEncoder();
  if (encoder.encode(text).length <= maxBytes) return text;
  let out = "";
  for (const ch of text) {
    const next = out + ch;
    if (encoder.encode(next).length > maxBytes) break;
    out = next;
  }
  return out;
}

function fitMemo(prefix: string, middle: string, suffix: string): string {
  const encoder = new TextEncoder();
  const budget =
    SEND_MEMO_MAX_BYTES - encoder.encode(prefix).length - encoder.encode(suffix).length;
  if (budget < 1) return truncateMemo(`${prefix}${suffix}`);
  return `${prefix}${truncateMemo(middle, budget)}${suffix}`;
}

export function rewardMemo(thankerName: string): string {
  const name = String(thankerName ?? "").trim() || "someone";
  return truncateMemo(`${name} thanked you on Cinima`);
}

export function rewardMemoFor(handle: string | null | undefined, wallet: string): string {
  return rewardMemo(displayName(handle, wallet));
}

/** 1 NIM User Send from a thanker's wallet. Same size as a Reward. */
export const USER_SEND_NIM = REWARD_NIM;
export const USER_SEND_LUNA = REWARD_LUNA;

/** UI label for an optional User Send. */
export const USER_SEND_CTA = "Send Custom Message";

/** Cost shown on the message picker. Paid from the thanker's wallet. */
export const USER_SEND_COST_LABEL = `${USER_SEND_NIM} NIM`;
export const USER_SEND_FREE_LABEL = "Free";

export const USER_SEND_NOTES = [
  { id: "thanks", label: "Thanks" },
  { id: "thanks-rec", label: "Thanks for the rec" },
  { id: "loved-take", label: "Loved this take" },
  { id: "watchlist", label: "Going on my Watchlist" },
  { id: "great-taste", label: "You have great taste" },
  { id: "thanks-cinima", label: "Thanks on Cinima" },
] as const;

export type UserSendNoteId = (typeof USER_SEND_NOTES)[number]["id"];

export const DEFAULT_USER_SEND_NOTE_ID: UserSendNoteId = "thanks";

export function isUserSendNoteId(value: string): value is UserSendNoteId {
  return USER_SEND_NOTES.some((note) => note.id === value);
}

export function defaultUserSendNoteId(_kind?: "title" | "comment"): UserSendNoteId {
  return DEFAULT_USER_SEND_NOTE_ID;
}

/** Demo / missing-memo fallback for a paid User Send. */
export function defaultPaidUserSendNoteId(kind: "title" | "comment"): UserSendNoteId {
  return kind === "comment" ? "loved-take" : "thanks-rec";
}

export function userSendNoteLuna(id: UserSendNoteId): number {
  return id === "thanks" ? 0 : USER_SEND_LUNA;
}

export function userSendNoteCostLabel(id: UserSendNoteId): string {
  return userSendNoteLuna(id) > 0 ? USER_SEND_COST_LABEL : USER_SEND_FREE_LABEL;
}

export function userSendNoteLabel(id: UserSendNoteId): string {
  const note = USER_SEND_NOTES.find((row) => row.id === id);
  return note?.label ?? USER_SEND_NOTES[0]!.label;
}

export function userSendMemo(noteLabel: string): string {
  const text = String(noteLabel ?? "").trim() || USER_SEND_NOTES[0]!.label;
  return truncateMemo(text);
}

export function userSendMemoForNote(id: UserSendNoteId, senderName?: string): string {
  const label = userSendNoteLabel(id);
  const name = String(senderName ?? "").trim();
  if (!name) return userSendMemo(label);
  return truncateMemo(`${label} - ${name}`);
}

export function isUserSendMemo(memo: string): boolean {
  const text = String(memo ?? "");
  const notes = [...USER_SEND_NOTES].sort((a, b) => b.label.length - a.label.length);
  return notes.some((note) => {
    const label = userSendNoteLabel(note.id);
    if (text === userSendMemo(label)) return true;
    const prefix = `${label} - `;
    return text.startsWith(prefix) && text.slice(prefix.length).trim().length > 0;
  });
}

/** Persist a catalog note; demo hashes fall back to a paid note for that kind. */
export function userSendMemoOrDefault(memo: string, kind: "title" | "comment"): string {
  if (isUserSendMemo(memo)) return memo;
  return userSendMemoForNote(defaultPaidUserSendNoteId(kind));
}

/** Mainnet explorer for a User Send hash. Demo hashes have no chain page. */
export function nimiqWatchTxUrl(txHash: string): string | null {
  let hex = String(txHash ?? "").trim();
  if (hex.startsWith("0x") || hex.startsWith("0X")) hex = hex.slice(2);
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return `https://nimiq.watch/#${hex.toLowerCase()}`;
}

/** Me Guestbook heading: cinema guestbook as a Handle's received history. */
export const RECEIVED_LIST_HEADING = "Guestbook";

export type ReceivedThanksKind = "title" | "comment";
export type ReceivedItemKind = ReceivedThanksKind | "join";

/** One-line why under the title on a Guestbook card. */
export function receivedThanksHow(kind: ReceivedThanksKind): string {
  switch (kind) {
    case "comment":
      return "Thanked your comment";
    case "title":
      return "Thanked your recommendation";
  }
}

export function receivedHow(kind: ReceivedItemKind): string {
  if (kind === "join") return JOIN_GRANT_HOW;
  return receivedThanksHow(kind);
}

export function receivedNimLabel(rewardNim: number, sendNim: number): string | null {
  const n = Number(rewardNim || 0) + Number(sendNim || 0);
  if (n <= 0) return null;
  return `+${n} NIM`;
}

/** Return digest gold line when NIM arrived since last Presence. */
export function digestNimReceivedLabel(nimReceived: number): string | null {
  const n = Number(nimReceived || 0);
  if (n <= 0) return null;
  return `+${n} NIM received`;
}

/** Return digest shows at most this many thanker Identicons. */
export const DIGEST_THANKER_CAP = 8;

/** Presence gap that counts as a return (matches API heartbeat max gap). */
export const DIGEST_RETURN_GAP_MS = 90_000;

export type DigestThanker = {
  walletAddress: string;
  handle: string | null;
};

export function capDigestThankers<T>(thankers: T[], cap = DIGEST_THANKER_CAP): T[] {
  return thankers.slice(0, Math.max(0, cap));
}

export function shouldShowReturnDigest(input: {
  thanksCount: number;
  nimReceived: number;
  onboarding: boolean;
  tourActive: boolean;
  joinOverlayPending?: boolean;
}): boolean {
  if (input.onboarding || input.tourActive || input.joinOverlayPending) return false;
  return input.thanksCount > 0 || input.nimReceived > 0;
}

export function isReturnPresence(
  previousLastAt: number | null,
  now: number,
  gapMs = DIGEST_RETURN_GAP_MS
): boolean {
  if (previousLastAt == null) return false;
  return now - previousLastAt > gapMs;
}

export function watchlistPingMemo(title: string): string {
  const name = String(title ?? "").trim() || "this";
  return fitMemo("Cinima.app - Have you watched: ", name, " yet?");
}

export function newUsersPingMemo(count: number): string {
  const n = Math.max(0, Math.floor(count));
  return truncateMemo(`Cinima.app - ${n} new users since last visit`);
}

export function creatorPingMemo(message: string): string {
  const body = String(message ?? "").trim();
  if (!body) return truncateMemo("Cinima.app");
  return truncateMemo(`Cinima.app - ${body}`);
}

/** Creator Ping the Creator queues to their own wallet from Studio. */
export const CREATOR_TEST_PING_MESSAGE = "Sender test";

export type SystemPingSkipReason =
  | "creator"
  | "tour"
  | "no-presence"
  | "not-lapsed"
  | "quiet"
  | "cooldown"
  | "nothing-to-say";

export type SystemPingDecision =
  | { kind: "watchlist"; title: string }
  | { kind: "new-users"; count: number }
  | { kind: "skip"; reason: SystemPingSkipReason };

export function decideSystemPing(input: {
  isCreator: boolean;
  tourResolved: boolean;
  lastPresenceAt: number | null;
  lastSystemPingAt: number | null;
  systemPingsSincePresence: number;
  oldestWatchlistTitle: string | null;
  newUsersSincePresence: number;
  now: number;
}): SystemPingDecision {
  if (input.isCreator) return { kind: "skip", reason: "creator" };
  if (!input.tourResolved) return { kind: "skip", reason: "tour" };
  if (input.lastPresenceAt == null) return { kind: "skip", reason: "no-presence" };
  if (!isLapsed(input.lastPresenceAt, input.now)) return { kind: "skip", reason: "not-lapsed" };
  if (isQuiet(input.systemPingsSincePresence)) return { kind: "skip", reason: "quiet" };
  if (
    input.lastSystemPingAt != null &&
    input.now - input.lastSystemPingAt < SYSTEM_PING_COOLDOWN_MS
  ) {
    return { kind: "skip", reason: "cooldown" };
  }
  const title = String(input.oldestWatchlistTitle ?? "").trim();
  if (title) return { kind: "watchlist", title };
  if (input.newUsersSincePresence >= SYSTEM_PING_MIN_NEW_USERS) {
    return { kind: "new-users", count: input.newUsersSincePresence };
  }
  return { kind: "skip", reason: "nothing-to-say" };
}
