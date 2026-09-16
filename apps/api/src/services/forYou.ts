import {
  isPassActive,
  nextForYouIds,
  recycleForYouIds,
  remainingForYouIds,
  removeFromForYouIds,
  restoreTourForYouSet,
  shouldPrefetchForYou,
  stageTourForYouSet,
  upcomingForYouIds,
  type ForYouPassResponse,
  type OverlapSuggestion,
} from "@cinima/shared";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { favorites, forYouPasses, forYouSets, titles, watchlist } from "../db/schema.js";
import { hasPoster } from "../lib/titles.js";
import { suggestionCandidates, suggestionsByIds } from "./suggestionPool.js";

export class ForYouError extends Error {
  constructor(
    readonly code: "not_in_set",
    message: string
  ) {
    super(message);
    this.name = "ForYouError";
  }
}

function parseSetIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

async function loadSetRow(
  wallet: string
): Promise<{ ids: string[]; holdOutIds: string[] }> {
  const [row] = await db
    .select()
    .from(forYouSets)
    .where(eq(forYouSets.walletAddress, wallet))
    .limit(1);
  return {
    ids: parseSetIds(row?.titleIds),
    holdOutIds: parseSetIds(row?.holdOutTitleIds),
  };
}

async function loadSetIds(wallet: string): Promise<string[]> {
  return (await loadSetRow(wallet)).ids;
}

async function saveSetIds(
  wallet: string,
  ids: string[],
  holdOutIds?: string[]
): Promise<void> {
  const now = new Date();
  const titleIds = JSON.stringify(ids);
  const holdOutJson =
    holdOutIds != null ? JSON.stringify(holdOutIds) : undefined;
  await db
    .insert(forYouSets)
    .values({
      walletAddress: wallet,
      titleIds,
      holdOutTitleIds: holdOutJson ?? "[]",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: forYouSets.walletAddress,
      set:
        holdOutJson != null
          ? { titleIds, holdOutTitleIds: holdOutJson, updatedAt: now }
          : { titleIds, updatedAt: now },
    });
}

async function loadTasteExcludeIds(wallet: string): Promise<Set<string>> {
  const [favRows, watchRows] = await Promise.all([
    db.select({ titleId: favorites.titleId }).from(favorites).where(eq(favorites.walletAddress, wallet)),
    db.select({ titleId: watchlist.titleId }).from(watchlist).where(eq(watchlist.walletAddress, wallet)),
  ]);
  const ids = new Set<string>();
  for (const row of favRows) ids.add(row.titleId);
  for (const row of watchRows) ids.add(row.titleId);
  return ids;
}

async function excludeIds(wallet: string, nowMs: number): Promise<Set<string>> {
  const [ids, passRows] = await Promise.all([
    loadTasteExcludeIds(wallet),
    db.select().from(forYouPasses).where(eq(forYouPasses.walletAddress, wallet)),
  ]);
  for (const row of passRows) {
    if (isPassActive(row.passedAt.getTime(), nowMs)) ids.add(row.titleId);
  }
  return ids;
}

async function recycledPassIds(wallet: string, skip: ReadonlySet<string>): Promise<string[]> {
  const rows = await db
    .select({
      titleId: forYouPasses.titleId,
      posterPath: titles.posterPath,
    })
    .from(forYouPasses)
    .innerJoin(titles, eq(forYouPasses.titleId, titles.id))
    .where(eq(forYouPasses.walletAddress, wallet))
    .orderBy(asc(forYouPasses.passedAt));
  const oldest = rows
    .filter((row) => hasPoster(row.posterPath))
    .map((row) => row.titleId);
  return recycleForYouIds(oldest, skip);
}

async function hydrate(
  ids: string[],
  candidates: OverlapSuggestion[],
  wallet: string
): Promise<OverlapSuggestion[]> {
  const byId = new Map<string, OverlapSuggestion>(candidates.map((s) => [s.title.id, s]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    for (const extra of await suggestionsByIds(missing, wallet)) {
      byId.set(extra.title.id, extra);
    }
  }
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row && hasPoster(row.title.posterUrl) ? [row] : [];
  });
}

async function resolveSet(
  wallet: string,
  extraExclude: Iterable<string> = []
): Promise<{ suggestions: OverlapSuggestion[]; refilled: boolean }> {
  const nowMs = Date.now();
  const { ids: stored, holdOutIds } = await loadSetRow(wallet);
  const sticky = await loadTasteExcludeIds(wallet);
  const blocked = await excludeIds(wallet, nowMs);
  for (const id of [...extraExclude, ...holdOutIds]) {
    sticky.add(id);
    blocked.add(id);
  }
  const candidates = await suggestionCandidates(wallet, blocked);
  const remaining = remainingForYouIds(stored, sticky);
  const hydratedRemaining = await hydrate(remaining, candidates, wallet);
  const remainingIds = hydratedRemaining.map((s) => s.title.id);
  let candidateIds: string[] = candidates
    .map((s) => s.title.id)
    .filter((id) => !blocked.has(id));
  const skip = new Set([...sticky, ...remainingIds]);
  if (candidateIds.filter((id) => !skip.has(id)).length === 0) {
    candidateIds = [...candidateIds, ...(await recycledPassIds(wallet, skip))];
  }
  const next = nextForYouIds(remainingIds, candidateIds);
  const idsChanged = next.ids.join("|") !== stored.join("|");
  if (next.refilled) {
    await saveSetIds(wallet, next.ids, []);
  } else if (idsChanged) {
    await saveSetIds(wallet, next.ids);
  }
  return {
    suggestions: await hydrate(next.ids, candidates, wallet),
    refilled: next.refilled,
  };
}

export async function peekUpcomingForYou(wallet: string): Promise<OverlapSuggestion[]> {
  const nowMs = Date.now();
  const { ids: stored, holdOutIds } = await loadSetRow(wallet);
  const sticky = await loadTasteExcludeIds(wallet);
  const blocked = await excludeIds(wallet, nowMs);
  for (const id of holdOutIds) {
    sticky.add(id);
    blocked.add(id);
  }
  const candidates = await suggestionCandidates(wallet, blocked);
  const remaining = remainingForYouIds(stored, sticky);
  let candidateIds: string[] = candidates
    .map((s) => s.title.id)
    .filter((id) => !blocked.has(id));
  const skip = new Set([...sticky, ...remaining]);
  if (candidateIds.filter((id) => !skip.has(id)).length === 0) {
    candidateIds = [...candidateIds, ...(await recycledPassIds(wallet, skip))];
  }
  return hydrate(upcomingForYouIds(remaining, candidateIds), candidates, wallet);
}

export async function presentForYou(wallet: string): Promise<OverlapSuggestion[]> {
  const { suggestions } = await resolveSet(wallet);
  return suggestions;
}

export async function passForYou(wallet: string, titleId: string): Promise<ForYouPassResponse> {
  const stored = await loadSetIds(wallet);
  const current = stored.length ? stored : (await resolveSet(wallet)).suggestions.map((s) => s.title.id);
  if (!current.includes(titleId)) {
    throw new ForYouError("not_in_set", "Title is not in the For You set");
  }

  const now = new Date();
  await db
    .insert(forYouPasses)
    .values({
      walletAddress: wallet,
      titleId,
      passedAt: now,
    })
    .onConflictDoUpdate({
      target: [forYouPasses.walletAddress, forYouPasses.titleId],
      set: { passedAt: now },
    });

  const afterPass = removeFromForYouIds(current, titleId);
  await saveSetIds(wallet, afterPass);
  const resolved = await resolveSet(wallet);
  const refilled = afterPass.length === 0 && resolved.refilled;
  const upcoming =
    !refilled && shouldPrefetchForYou(resolved.suggestions.length)
      ? await peekUpcomingForYou(wallet)
      : undefined;
  return {
    suggestions: resolved.suggestions,
    refilled,
    upcoming,
  };
}

export async function dropFromForYouSet(wallet: string, titleId: string): Promise<void> {
  const stored = await loadSetIds(wallet);
  if (!stored.includes(titleId)) return;
  await saveSetIds(wallet, removeFromForYouIds(stored, titleId));
  await resolveSet(wallet, [titleId]);
}

export async function restoreGuidedTourForYou(wallet: string): Promise<void> {
  const { ids, holdOutIds } = await loadSetRow(wallet);
  if (!holdOutIds.length) return;
  await saveSetIds(wallet, restoreTourForYouSet(ids, holdOutIds), []);
}

export async function stageGuidedTourForYou(wallet: string): Promise<OverlapSuggestion[]> {
  const { ids, holdOutIds } = await loadSetRow(wallet);
  if (holdOutIds.length && ids.length <= 1) {
    const { suggestions } = await resolveSet(wallet);
    return suggestions;
  }
  await restoreGuidedTourForYou(wallet);
  const { suggestions } = await resolveSet(wallet);
  const staged = stageTourForYouSet(suggestions.map((row) => row.title.id));
  if (!staged.holdOutIds.length) return suggestions;
  await saveSetIds(wallet, staged.teachingIds, staged.holdOutIds);
  const teaching = new Set(staged.teachingIds);
  return suggestions.filter((row) => teaching.has(row.title.id));
}
