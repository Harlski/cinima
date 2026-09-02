import { isCreatorWallet } from "@cinima/shared";

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
