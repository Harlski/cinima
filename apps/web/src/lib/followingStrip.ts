import type { FollowingPerson } from "@cinima/shared";

export type FollowingStripPerson = FollowingPerson & {
  lastActivityAt: string | null;
};

const STORAGE_KEY = "cinima:following-strip-seen";

type SeenMap = Record<string, string>;

function readSeen(): SeenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as SeenMap;
  } catch {
    return {};
  }
}

function writeSeen(map: SeenMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

export function isFollowingUnseen(
  person: FollowingStripPerson,
  seenAt: string | null | undefined
): boolean {
  if (!person.lastActivityAt) return false;
  if (!seenAt) return true;
  return person.lastActivityAt > seenAt;
}

/** Unseen (newest first), then seen (newest first). */
export function sortFollowingStripPeople(
  people: readonly FollowingStripPerson[],
  seen: SeenMap
): FollowingStripPerson[] {
  return [...people].sort((a, b) => {
    const aUnseen = isFollowingUnseen(a, seen[a.walletAddress]);
    const bUnseen = isFollowingUnseen(b, seen[b.walletAddress]);
    if (aUnseen !== bUnseen) return aUnseen ? -1 : 1;
    const aAt = a.lastActivityAt ?? "";
    const bAt = b.lastActivityAt ?? "";
    if (aAt !== bAt) return aAt < bAt ? 1 : -1;
    return a.walletAddress.localeCompare(b.walletAddress);
  });
}

export function loadFollowingStripSeen(): SeenMap {
  return readSeen();
}

export function markFollowingStripSeen(
  walletAddress: string,
  lastActivityAt: string | null | undefined
): SeenMap {
  const map = readSeen();
  if (!lastActivityAt) return map;
  const prev = map[walletAddress];
  if (prev && prev >= lastActivityAt) return map;
  map[walletAddress] = lastActivityAt;
  writeSeen(map);
  return map;
}
