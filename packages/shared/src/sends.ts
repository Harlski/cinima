import { LUNA_PER_NIM } from "./constants.js";
import { displayName } from "./memos.js";

/** 1 NIM Reward attached to a Thanks. */
export const REWARD_NIM = 1;
export const REWARD_LUNA = REWARD_NIM * LUNA_PER_NIM;

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

export type SendKind = "reward" | "ping";
export type SendSource = "thanks" | "system" | "creator";
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
