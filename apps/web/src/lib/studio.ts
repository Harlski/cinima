import { CREATOR_TEST_PING_MESSAGE, CREATOR_WALLET, isCreatorWallet } from "@cinima/shared";

export function studioEntryVisible(wallet: string | null | undefined): boolean {
  return !!wallet && isCreatorWallet(wallet);
}

export type StudioOpenDecision =
  | { kind: "redirect-me" }
  | { kind: "show" }
  | { kind: "error"; message: string };

/** Creator stays on Studio when the snapshot cannot load. Only a non-Creator is sent to Me. */
export function decideStudioOpen(input: {
  wallet: string | null | undefined;
  fetchError?: string | null;
}): StudioOpenDecision {
  if (!studioEntryVisible(input.wallet)) return { kind: "redirect-me" };
  if (input.fetchError) return { kind: "error", message: input.fetchError };
  return { kind: "show" };
}

/** Compact Presence label for Studio. */
export function formatActiveMs(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

export const USAGE_HEARTBEAT_MS = 30_000;

/** Per-link Share visit line for Studio. */
export function formatShareVisitCounts(row: {
  webCount: number;
  payCount: number;
  payCtaCount: number;
}): string {
  return `${row.webCount} web · ${row.payCount} pay · ${row.payCtaCount} Pay intent`;
}

/** In-app profile for a Studio Handle row. */
export function studioProfileLocation(
  wallet: string | null | undefined
): { name: "user"; params: { wallet: string } } | null {
  const w = String(wallet ?? "").trim();
  if (!w) return null;
  return { name: "user", params: { wallet: w } };
}

/** One-click Creator Ping to the Creator wallet. */
export function creatorSelfPingRequest(): { toWallet: string; message: string } {
  return { toWallet: CREATOR_WALLET, message: CREATOR_TEST_PING_MESSAGE };
}

export type PingHandleOption = {
  walletAddress: string;
  handle: string | null;
};

/** Rank Handle matches for the Studio Ping picker. Prefix beats contains. */
export function suggestPingHandles(
  people: PingHandleOption[],
  query: string,
  selectedWallets: readonly string[],
  limit = 8
): PingHandleOption[] {
  const q = String(query ?? "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
  if (!q) return [];
  const selected = new Set(selectedWallets);
  return people
    .filter((p) => {
      if (selected.has(p.walletAddress)) return false;
      const handle = String(p.handle ?? "").toLowerCase();
      return handle.includes(q);
    })
    .sort((a, b) => {
      const ah = String(a.handle ?? "").toLowerCase();
      const bh = String(b.handle ?? "").toLowerCase();
      const aPrefix = ah.startsWith(q) ? 0 : 1;
      const bPrefix = bh.startsWith(q) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return ah.localeCompare(bh);
    })
    .slice(0, limit);
}

export function creatorPingBody(
  selected: { walletAddress: string }[],
  message: string
): { toWallets: string[]; message: string } {
  return {
    toWallets: selected.map((p) => p.walletAddress),
    message,
  };
}

/** Studio command: Ping every Handle with the same memo. */
export function creatorEveryonePingBody(message: string): { everyone: true; message: string } {
  return { everyone: true, message };
}

/** Typeahead shows Everyone when the query is a prefix of the command. */
export function everyoneCommandVisible(query: string): boolean {
  const q = String(query ?? "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
  if (q.length < 3) return false;
  return "everyone".startsWith(q);
}
