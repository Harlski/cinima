import { and, asc, desc, eq, gte, gt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  CREATOR_WALLET,
  CREATOR_TEST_PING_MESSAGE,
  PING_LUNA,
  REWARD_LUNA,
  creatorPingMemo,
  decideSystemPing,
  isCreatorWallet,
  isQuiet,
  newUsersPingMemo,
  normalizeWallet,
  rewardMemoFor,
  rewardsRemainingToday,
  watchlistPingMemo,
  type StudioSendRow,
  type StudioSenderStatus,
} from "@cinima/shared";
import { db } from "../db/index.js";
import {
  presenceDays,
  senderHeartbeat,
  sends,
  thanks,
  titles,
  users,
  watchlist,
} from "../db/schema.js";
import { config } from "../lib/config.js";
import { utcDayKey } from "./usage.js";
import {
  createMemoryChain,
  createNimiqChain,
  createUnconfiguredChain,
  type ChainAdapter,
} from "./sendsChain.js";

const MAX_ATTEMPTS = 8;
const PROCESS_BATCH = 10;
const HEARTBEAT_ID = 1;

let chainOverride: ChainAdapter | null = null;
let resolvedChain: ChainAdapter | null = null;

export function setSendChain(adapter: ChainAdapter | null): void {
  chainOverride = adapter;
  resolvedChain = adapter;
}

export async function getSendChain(): Promise<ChainAdapter> {
  if (chainOverride) return chainOverride;
  if (resolvedChain) return resolvedChain;
  const key = config.senderPrivateKey.trim();
  if (key.length >= 64) {
    resolvedChain = await createNimiqChain({
      privateKey: key,
      network: config.nimiqNetwork,
      rpcUrl: config.nimiqRpcUrl,
    });
    return resolvedChain;
  }
  if (config.demoMode) {
    resolvedChain = createMemoryChain();
    return resolvedChain;
  }
  resolvedChain = createUnconfiguredChain();
  return resolvedChain;
}

export async function enqueueSend(input: {
  kind: "reward" | "ping";
  source: "thanks" | "system" | "creator";
  fromWallet?: string | null;
  toWallet: string;
  luna: number;
  memo: string;
  idempotencyKey: string;
  thanksId?: number | null;
  at?: Date;
}): Promise<{ queued: boolean; id: number | null }> {
  const toWallet = normalizeWallet(input.toWallet);
  if (!toWallet) return { queued: false, id: null };
  const fromWallet = input.fromWallet ? normalizeWallet(input.fromWallet) : null;
  const inserted = await db
    .insert(sends)
    .values({
      kind: input.kind,
      source: input.source,
      fromWallet,
      toWallet,
      luna: input.luna,
      memo: input.memo,
      status: "queued",
      idempotencyKey: input.idempotencyKey,
      thanksId: input.thanksId ?? null,
      createdAt: input.at ?? new Date(),
      attempts: 0,
    })
    .onConflictDoNothing()
    .returning({ id: sends.id });
  return { queued: inserted.length > 0, id: inserted[0]?.id ?? null };
}

async function rewardCountToday(fromWallet: string, atMs: number): Promise<number> {
  const day = utcDayKey(atMs);
  const start = new Date(`${day}T00:00:00.000Z`);
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(sends)
    .where(
      and(
        eq(sends.kind, "reward"),
        eq(sends.fromWallet, fromWallet),
        gte(sends.createdAt, start)
      )
    );
  return Number(row?.n || 0);
}

export async function queueRewardForThanks(opts: {
  thanksId?: number | null;
  idempotencyKey?: string;
  fromWallet: string;
  toWallet: string;
  at?: Date;
}): Promise<boolean> {
  const fromWallet = normalizeWallet(opts.fromWallet);
  const toWallet = normalizeWallet(opts.toWallet);
  if (!fromWallet || !toWallet || fromWallet === toWallet) return false;
  const at = opts.at ?? new Date();
  if (rewardsRemainingToday(await rewardCountToday(fromWallet, at.getTime())) <= 0) {
    return false;
  }
  const [thanker] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.walletAddress, fromWallet))
    .limit(1);
  const thanksId = opts.thanksId ?? null;
  const idempotencyKey =
    opts.idempotencyKey ?? (thanksId != null ? `reward:thanks:${thanksId}` : null);
  if (!idempotencyKey) return false;
  const result = await enqueueSend({
    kind: "reward",
    source: "thanks",
    fromWallet,
    toWallet,
    luna: REWARD_LUNA,
    memo: rewardMemoFor(thanker?.handle, fromWallet),
    idempotencyKey,
    thanksId,
    at,
  });
  return result.queued;
}

export async function queueRewardsForThanks(opts: {
  fromWallet: string;
  rows: { id: number; toWallet: string }[];
  at?: Date;
}): Promise<number> {
  let n = 0;
  for (const row of opts.rows) {
    if (await queueRewardForThanks({
      thanksId: row.id,
      fromWallet: opts.fromWallet,
      toWallet: row.toWallet,
      at: opts.at,
    })) {
      n += 1;
    }
  }
  return n;
}

export async function queueCreatorPing(opts: {
  toWallet: string;
  message: string;
  at?: Date;
}): Promise<{ queued: boolean; memo: string }> {
  const memo = creatorPingMemo(opts.message);
  const result = await enqueueSend({
    kind: "ping",
    source: "creator",
    fromWallet: CREATOR_WALLET,
    toWallet: opts.toWallet,
    luna: PING_LUNA,
    memo,
    idempotencyKey: `creator:${nanoid()}`,
    at: opts.at,
  });
  return { queued: result.queued, memo };
}

export async function queueCreatorSelfPing(at?: Date): Promise<{ queued: boolean; memo: string }> {
  return queueCreatorPing({
    toWallet: CREATOR_WALLET,
    message: CREATOR_TEST_PING_MESSAGE,
    at,
  });
}

export async function lastPresenceAt(wallet: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: sql<number>`max(${presenceDays.lastHeartbeatAt})` })
    .from(presenceDays)
    .where(eq(presenceDays.walletAddress, wallet));
  return row?.at ? new Date(row.at) : null;
}

async function lastSystemPingAt(wallet: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: sends.createdAt })
    .from(sends)
    .where(and(eq(sends.toWallet, wallet), eq(sends.source, "system")))
    .orderBy(desc(sends.createdAt))
    .limit(1);
  return row?.at ?? null;
}

async function systemPingsSince(wallet: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(sends)
    .where(
      and(eq(sends.toWallet, wallet), eq(sends.source, "system"), gt(sends.createdAt, since))
    );
  return Number(row?.n || 0);
}

async function oldestWatchlistTitle(wallet: string): Promise<string | null> {
  const [row] = await db
    .select({ title: titles.title })
    .from(watchlist)
    .innerJoin(titles, eq(watchlist.titleId, titles.id))
    .where(eq(watchlist.walletAddress, wallet))
    .orderBy(asc(watchlist.createdAt))
    .limit(1);
  return row?.title ?? null;
}

async function newUsersSince(since: Date, exceptWallet: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(and(gt(users.createdAt, since), sql`${users.walletAddress} != ${exceptWallet}`));
  return Number(row?.n || 0);
}

export async function walletIsQuiet(wallet: string): Promise<boolean> {
  const presence = await lastPresenceAt(wallet);
  if (!presence) return false;
  return isQuiet(await systemPingsSince(wallet, presence));
}

export async function quietByWallet(wallets: string[]): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  for (const wallet of wallets) {
    out.set(wallet, await walletIsQuiet(wallet));
  }
  return out;
}

export async function planSystemPings(now = new Date()): Promise<number> {
  const rows = await db
    .select({
      walletAddress: users.walletAddress,
      guidedTourSkippedAt: users.guidedTourSkippedAt,
      guidedTourCompletedAt: users.guidedTourCompletedAt,
    })
    .from(users);
  let queued = 0;
  for (const user of rows) {
    const wallet = user.walletAddress;
    const presence = await lastPresenceAt(wallet);
    const lastPing = await lastSystemPingAt(wallet);
    const sincePresence = presence ? await systemPingsSince(wallet, presence) : 0;
    const title = await oldestWatchlistTitle(wallet);
    const newUsers = presence ? await newUsersSince(presence, wallet) : 0;
    const decision = decideSystemPing({
      isCreator: isCreatorWallet(wallet),
      tourResolved: user.guidedTourSkippedAt != null || user.guidedTourCompletedAt != null,
      lastPresenceAt: presence?.getTime() ?? null,
      lastSystemPingAt: lastPing?.getTime() ?? null,
      systemPingsSincePresence: sincePresence,
      oldestWatchlistTitle: title,
      newUsersSincePresence: newUsers,
      now: now.getTime(),
    });
    if (decision.kind === "skip") continue;
    const memo =
      decision.kind === "watchlist"
        ? watchlistPingMemo(decision.title)
        : newUsersPingMemo(decision.count);
    const day = utcDayKey(now.getTime());
    const result = await enqueueSend({
      kind: "ping",
      source: "system",
      toWallet: wallet,
      luna: PING_LUNA,
      memo,
      idempotencyKey: `system:${wallet}:${day}`,
      at: now,
    });
    if (result.queued) queued += 1;
  }
  return queued;
}

async function writeHeartbeat(chain: ChainAdapter, at = new Date()): Promise<void> {
  let balanceLuna: number | null = null;
  const configured = chain.configured();
  if (configured) {
    try {
      balanceLuna = Number(await chain.balanceLuna());
    } catch {
      balanceLuna = null;
    }
  }
  await db
    .insert(senderHeartbeat)
    .values({
      id: HEARTBEAT_ID,
      configured,
      balanceLuna,
      updatedAt: at,
    })
    .onConflictDoUpdate({
      target: senderHeartbeat.id,
      set: { configured, balanceLuna, updatedAt: at },
    });
}

export async function readSenderStatus(): Promise<StudioSenderStatus> {
  const [row] = await db
    .select()
    .from(senderHeartbeat)
    .where(eq(senderHeartbeat.id, HEARTBEAT_ID))
    .limit(1);
  return {
    configured: row?.configured ?? false,
    balanceLuna: row?.balanceLuna ?? null,
    updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

export async function listRecentSends(limit = 40): Promise<StudioSendRow[]> {
  const rows = await db
    .select({
      send: sends,
      handle: users.handle,
    })
    .from(sends)
    .leftJoin(users, eq(sends.toWallet, users.walletAddress))
    .orderBy(desc(sends.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.send.id,
    kind: r.send.kind as StudioSendRow["kind"],
    source: r.send.source as StudioSendRow["source"],
    toWallet: r.send.toWallet,
    toHandle: r.handle ?? null,
    luna: r.send.luna,
    memo: r.send.memo,
    status: r.send.status as StudioSendRow["status"],
    txHash: r.send.txHash ?? null,
    createdAt: r.send.createdAt.toISOString(),
  }));
}

async function completeSend(row: typeof sends.$inferSelect, txHash: string, at: Date) {
  await db
    .update(sends)
    .set({ status: "sent", txHash, sentAt: at, error: null })
    .where(eq(sends.id, row.id));
  if (row.thanksId) {
    await db.update(thanks).set({ tipTxHash: txHash }).where(eq(thanks.id, row.thanksId));
  }
}

async function failOrRequeue(row: typeof sends.$inferSelect, error: string) {
  const attempts = row.attempts + 1;
  const status = attempts >= MAX_ATTEMPTS ? "failed" : "queued";
  await db
    .update(sends)
    .set({ status, error, attempts })
    .where(eq(sends.id, row.id));
}

export async function processQueue(limit = PROCESS_BATCH): Promise<{ sent: number; failed: number }> {
  const chain = await getSendChain();
  await writeHeartbeat(chain);
  if (!chain.configured()) return { sent: 0, failed: 0 };

  const queued = await db
    .select()
    .from(sends)
    .where(eq(sends.status, "queued"))
    .orderBy(asc(sends.id))
    .limit(limit);

  let sent = 0;
  let failed = 0;
  for (const row of queued) {
    const claimed = await db
      .update(sends)
      .set({ status: "sending" })
      .where(and(eq(sends.id, row.id), eq(sends.status, "queued")))
      .returning();
    if (!claimed[0]) continue;
    try {
      const balance = await chain.balanceLuna();
      if (balance < BigInt(row.luna)) {
        await db
          .update(sends)
          .set({ status: "queued", error: "insufficient_balance" })
          .where(eq(sends.id, row.id));
        continue;
      }
      const result = await chain.send({
        to: row.toWallet,
        luna: row.luna,
        memo: row.memo,
      });
      await completeSend(row, result.txHash, new Date());
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "send_failed";
      await failOrRequeue(row, message);
      if (row.attempts + 1 >= MAX_ATTEMPTS) failed += 1;
    }
  }
  await writeHeartbeat(chain);
  return { sent, failed };
}

let senderLoop: ReturnType<typeof setInterval> | null = null;

export function startSenderLoop(): void {
  if (senderLoop) return;
  const tick = async () => {
    try {
      await planSystemPings();
      await processQueue();
    } catch (err) {
      console.warn("[sender] tick failed", err);
    }
  };
  void tick();
  senderLoop = setInterval(() => void tick(), 60_000);
}

export function stopSenderLoop(): void {
  if (!senderLoop) return;
  clearInterval(senderLoop);
  senderLoop = null;
}
