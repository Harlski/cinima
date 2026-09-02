import { and, desc, eq, gte } from "drizzle-orm";
import { isTitleId, normalizeWallet } from "@cinima/shared";
import { db } from "../db/index.js";
import { presenceDays, usageEvents } from "../db/schema.js";

const SEARCH_DEDUPE_MS = 10 * 60 * 1000;
const VIEW_DEDUPE_MS = 30 * 60 * 1000;
const HEARTBEAT_MAX_GAP_MS = 90_000;
const SEARCH_MAX_LEN = 80;

export function normalizeSearchQuery(raw: string): string | null {
  const query = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, SEARCH_MAX_LEN);
  return query.length < 2 ? null : query;
}

export function utcDayKey(atMs: number): string {
  return new Date(atMs).toISOString().slice(0, 10);
}

export async function recordSearch(
  walletRaw: string,
  rawQuery: string,
  atMs = Date.now()
): Promise<{ recorded: boolean; query: string | null }> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return { recorded: false, query: null };
  const walletAddress = normalizeWallet(walletRaw);
  const since = new Date(atMs - SEARCH_DEDUPE_MS);
  const recent = await db.query.usageEvents.findFirst({
    where: and(
      eq(usageEvents.walletAddress, walletAddress),
      eq(usageEvents.kind, "search"),
      eq(usageEvents.query, query),
      gte(usageEvents.createdAt, since)
    ),
    orderBy: desc(usageEvents.createdAt),
  });
  if (recent) return { recorded: false, query };
  await db.insert(usageEvents).values({
    walletAddress,
    kind: "search",
    query,
    titleId: null,
    createdAt: new Date(atMs),
  });
  return { recorded: true, query };
}

export async function recordView(
  walletRaw: string,
  titleId: string,
  atMs = Date.now()
): Promise<{ recorded: boolean; titleId: string } | { error: "invalid_title" }> {
  if (!isTitleId(titleId)) return { error: "invalid_title" };
  const walletAddress = normalizeWallet(walletRaw);
  const since = new Date(atMs - VIEW_DEDUPE_MS);
  const recent = await db.query.usageEvents.findFirst({
    where: and(
      eq(usageEvents.walletAddress, walletAddress),
      eq(usageEvents.kind, "view"),
      eq(usageEvents.titleId, titleId),
      gte(usageEvents.createdAt, since)
    ),
  });
  if (recent) return { recorded: false, titleId };
  await db.insert(usageEvents).values({
    walletAddress,
    kind: "view",
    query: null,
    titleId,
    createdAt: new Date(atMs),
  });
  return { recorded: true, titleId };
}

export async function recordHeartbeat(
  walletRaw: string,
  atMs = Date.now()
): Promise<{ day: string; activeMs: number }> {
  const walletAddress = normalizeWallet(walletRaw);
  const day = utcDayKey(atMs);
  const at = new Date(atMs);
  const existing = await db.query.presenceDays.findFirst({
    where: and(eq(presenceDays.walletAddress, walletAddress), eq(presenceDays.day, day)),
  });
  if (!existing) {
    await db.insert(presenceDays).values({
      walletAddress,
      day,
      activeMs: 0,
      lastHeartbeatAt: at,
    });
    return { day, activeMs: 0 };
  }
  const last = existing.lastHeartbeatAt.getTime();
  const gap = atMs - last;
  const add = gap > 0 && gap <= HEARTBEAT_MAX_GAP_MS ? gap : 0;
  const activeMs = existing.activeMs + add;
  await db
    .update(presenceDays)
    .set({ activeMs, lastHeartbeatAt: at })
    .where(and(eq(presenceDays.walletAddress, walletAddress), eq(presenceDays.day, day)));
  return { day, activeMs };
}
