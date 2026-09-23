import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  CREATOR_WALLET,
  JOIN_GRANT_HOW,
  JOIN_GRANT_LUNA,
  JOIN_GRANT_MEMO,
} from "@cinima/shared";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-join-grant-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const NEW_WALLET = "NQ05JOINGRANTNEWWALLET000000000001";
const RETURNING_WALLET = "NQ05JOINGRANTRETURNWALLET00000001";
const LATER_RETURN_WALLET = "NQ05JOINGRANTLATERRETURNWALLET001";
const RETURNING_TOKEN = "join-grant-returning-token";
const TITLE_ID = "tmdb:movie:550";

describe("Join grant HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };
  let db: typeof import("../src/db/index.js").db;
  let schema: typeof import("../src/db/schema.js");
  let setSendChain: typeof import("../src/services/sends.js").setSendChain;
  let processQueue: typeof import("../src/services/sends.js").processQueue;
  let createMemoryChain: typeof import("../src/services/sendsChain.js").createMemoryChain;
  let setDoorAlarmSender: (typeof import("../src/services/doorAlarm.js"))["setDoorAlarmSender"];
  let resetDoorAlarmSender: (typeof import("../src/services/doorAlarm.js"))["resetDoorAlarmSender"];
  const doorLines: string[] = [];

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    db = (await import("../src/db/index.js")).db;
    schema = await import("../src/db/schema.js");
    const sends = await import("../src/services/sends.js");
    setSendChain = sends.setSendChain;
    processQueue = sends.processQueue;
    createMemoryChain = (await import("../src/services/sendsChain.js")).createMemoryChain;
    const doorAlarm = await import("../src/services/doorAlarm.js");
    setDoorAlarmSender = doorAlarm.setDoorAlarmSender;
    resetDoorAlarmSender = doorAlarm.resetDoorAlarmSender;

    const now = new Date();
    await db.insert(schema.users).values([
      {
        walletAddress: RETURNING_WALLET,
        handle: "back",
        lifetimeUnlockedAt: null,
        createdAt: new Date(now.getTime() - 86400000),
      },
      {
        walletAddress: LATER_RETURN_WALLET,
        handle: "later",
        lifetimeUnlockedAt: null,
        createdAt: new Date(now.getTime() - 86400000),
      },
      {
        walletAddress: CREATOR_WALLET,
        handle: "cinima",
        lifetimeUnlockedAt: null,
        createdAt: new Date(now.getTime() - 86400000),
      },
    ]);
    await db.insert(schema.sessions).values({
      token: RETURNING_TOKEN,
      walletAddress: RETURNING_WALLET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });
    await db.insert(schema.titles).values({
      id: TITLE_ID,
      mediaType: "movie",
      tmdbId: 550,
      title: "Fight Club",
      year: 1999,
      posterPath: null,
      overview: "fixture",
      imdbId: null,
      rating: "8.0",
      fetchedAt: now,
      source: "seed",
    });
    await db.insert(schema.favorites).values({
      walletAddress: RETURNING_WALLET,
      titleId: TITLE_ID,
      createdAt: now,
      recommendedAt: null,
    });
    app = (await import("../src/app.js")).app;
  });

  afterEach(async () => {
    setSendChain(null);
    doorLines.length = 0;
    resetDoorAlarmSender();
    const { setNimPayoutsPaused } = await import("../src/services/payouts.js");
    await setNimPayoutsPaused(false);
  });

  async function verify(demoWallet: string) {
    const challenge = await app.fetch(
      new Request("http://test/api/auth/challenge", {
        headers: { "X-Cinima-Demo": "1" },
      })
    );
    const { nonce, message } = (await challenge.json()) as {
      nonce: string;
      message: string;
    };
    return app.fetch(
      new Request("http://test/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Cinima-Demo": "1" },
        body: JSON.stringify({
          nonce,
          message,
          signerPublicKey: "demo",
          signature: "demo",
          demoWallet,
        }),
      })
    );
  }

  it("grants 10 NIM and Joined the crew to a new wallet without Join overlay or Marquee", async () => {
    const chain = createMemoryChain();
    setSendChain(chain);
    const res = await verify(NEW_WALLET);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      token: string;
      pendingJoinOverlay?: boolean;
    };
    expect(body.pendingJoinOverlay ?? false).toBe(false);

    const headers = {
      Authorization: `Bearer ${body.token}`,
      "X-Cinima-Demo": "1",
    };
    const me = await app.fetch(new Request("http://test/api/me", { headers }));
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as {
      pendingJoinOverlay?: boolean;
      unseenAchievements: string[];
      achievementCount: number;
    };
    expect(meBody.pendingJoinOverlay ?? false).toBe(false);
    expect(meBody.unseenAchievements).not.toContain("joined-the-crew");
    expect(meBody.achievementCount).toBe(1);

    const received = await app.fetch(new Request("http://test/api/me/received", { headers }));
    const receivedBody = (await received.json()) as {
      items: { kind: string; sendNim: number; sendTxHash: string | null }[];
    };
    const join = receivedBody.items.find((row) => row.kind === "join");
    expect(join).toMatchObject({ kind: "join", sendNim: 10 });
    expect(JOIN_GRANT_HOW).toBe("Joined Cinima");

    const processed = await processQueue();
    expect(processed.sent).toBe(1);
    expect(chain.sent[0]).toEqual({
      to: NEW_WALLET,
      luna: JOIN_GRANT_LUNA,
      memo: JOIN_GRANT_MEMO,
    });
  });

  it("does not grant twice to the same wallet", async () => {
    const again = await verify(NEW_WALLET);
    expect(again.status).toBe(200);
    const body = (await again.json()) as { token: string; pendingJoinOverlay?: boolean };
    expect(body.pendingJoinOverlay ?? false).toBe(false);

    const { db: database } = await import("../src/db/index.js");
    const schemaMod = await import("../src/db/schema.js");
    const { eq } = await import("drizzle-orm");
    const rows = await database
      .select()
      .from(schemaMod.sends)
      .where(eq(schemaMod.sends.toWallet, NEW_WALLET));
    expect(rows.filter((row) => row.source === "join")).toHaveLength(1);
  });

  it("Marquees Joined the crew on a new wallet's next login", async () => {
    const again = await verify(NEW_WALLET);
    const body = (await again.json()) as { token: string };
    const me = await app.fetch(
      new Request("http://test/api/me", {
        headers: { Authorization: `Bearer ${body.token}`, "X-Cinima-Demo": "1" },
      })
    );
    const meBody = (await me.json()) as { unseenAchievements: string[] };
    expect(meBody.unseenAchievements).toContain("joined-the-crew");
  });

  it("shows Join overlay for a returning wallet and keeps the tour gate closed", async () => {
    const headers = {
      Authorization: `Bearer ${RETURNING_TOKEN}`,
      "Content-Type": "application/json",
      "X-Cinima-Demo": "1",
    };
    const me = await app.fetch(new Request("http://test/api/me", { headers }));
    const meBody = (await me.json()) as {
      pendingJoinOverlay?: boolean;
      unseenAchievements: string[];
    };
    expect(meBody.pendingJoinOverlay).toBe(true);
    expect(meBody.unseenAchievements).not.toContain("joined-the-crew");

    const rec = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    expect(rec.status).toBe(200);
    const recBody = (await rec.json()) as { earnedAchievements?: string[] };
    expect(recBody.earnedAchievements || []).not.toContain("opening-night");

    const ack = await app.fetch(
      new Request("http://test/api/me/join-overlay", {
        method: "POST",
        headers,
      })
    );
    expect(ack.status).toBe(200);
    const meAfter = await app.fetch(new Request("http://test/api/me", { headers }));
    const afterBody = (await meAfter.json()) as { pendingJoinOverlay?: boolean };
    expect(afterBody.pendingJoinOverlay ?? false).toBe(false);
  });

  it("keeps Join overlay pending on a later login until Continue", async () => {
    const first = await verify(LATER_RETURN_WALLET);
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { token: string; pendingJoinOverlay?: boolean };
    expect(firstBody.pendingJoinOverlay).toBe(true);

    const later = await verify(LATER_RETURN_WALLET);
    expect(later.status).toBe(200);
    const laterBody = (await later.json()) as { token: string; pendingJoinOverlay?: boolean };
    expect(laterBody.pendingJoinOverlay).toBe(true);

    const headers = {
      Authorization: `Bearer ${laterBody.token}`,
      "X-Cinima-Demo": "1",
    };
    const me = await app.fetch(new Request("http://test/api/me", { headers }));
    const meBody = (await me.json()) as { pendingJoinOverlay?: boolean };
    expect(meBody.pendingJoinOverlay).toBe(true);
  });

  it("gives the Creator the Join grant and overlay like any returning wallet", async () => {
    const res = await verify(CREATOR_WALLET);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; pendingJoinOverlay?: boolean };
    expect(body.pendingJoinOverlay).toBe(true);
    const me = await app.fetch(
      new Request("http://test/api/me", {
        headers: { Authorization: `Bearer ${body.token}`, "X-Cinima-Demo": "1" },
      })
    );
    const meBody = (await me.json()) as { achievementCount: number; pendingJoinOverlay?: boolean };
    expect(meBody.pendingJoinOverlay).toBe(true);
    expect(meBody.achievementCount).toBe(1);
  });

  it("spends the Join grant without sending NIM while payouts are paused", async () => {
    const { setNimPayoutsPaused } = await import("../src/services/payouts.js");
    await setNimPayoutsPaused(true);
    const chain = createMemoryChain();
    setSendChain(chain);

    const wallet = "NQ05JOINGRANTPAUSEDWALLET000000001";
    const res = await verify(wallet);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      token: string;
      pendingJoinOverlay?: boolean;
      nimPayoutsPaused: boolean;
    };
    expect(body.nimPayoutsPaused).toBe(true);
    expect(body.pendingJoinOverlay ?? false).toBe(false);

    const headers = {
      Authorization: `Bearer ${body.token}`,
      "X-Cinima-Demo": "1",
    };
    const me = await app.fetch(new Request("http://test/api/me", { headers }));
    const meBody = (await me.json()) as {
      achievementCount: number;
      nimPayoutsPaused: boolean;
      pendingJoinOverlay?: boolean;
    };
    expect(meBody.nimPayoutsPaused).toBe(true);
    expect(meBody.achievementCount).toBe(1);
    expect(meBody.pendingJoinOverlay ?? false).toBe(false);

    const received = await app.fetch(new Request("http://test/api/me/received", { headers }));
    const receivedBody = (await received.json()) as {
      items: { kind: string; sendNim: number }[];
    };
    const join = receivedBody.items.find((row) => row.kind === "join");
    expect(join).toMatchObject({ kind: "join", sendNim: 0 });

    expect(await processQueue()).toEqual({ sent: 0, failed: 0 });
    expect(chain.sent).toEqual([]);

    await setNimPayoutsPaused(false);
    const again = await verify(wallet);
    expect(again.status).toBe(200);
    await processQueue();
    expect(chain.sent.some((tx) => tx.to === wallet)).toBe(false);

    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(schema.sends)
      .where(eq(schema.sends.toWallet, wallet));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "failed", error: "payouts_paused", kind: "join" });
  });

  it("does not broadcast a queued Send while payouts are paused", async () => {
    const { setNimPayoutsPaused } = await import("../src/services/payouts.js");
    const chain = createMemoryChain();
    setSendChain(chain);
    const { eq } = await import("drizzle-orm");
    await db
      .update(schema.sends)
      .set({ status: "queued", attempts: 0, error: null, txHash: null, sentAt: null })
      .where(eq(schema.sends.toWallet, CREATOR_WALLET));
    await setNimPayoutsPaused(true);
    expect(await processQueue()).toEqual({ sent: 0, failed: 0 });
    expect(chain.sent).toEqual([]);
    const [row] = await db
      .select({ status: schema.sends.status })
      .from(schema.sends)
      .where(eq(schema.sends.toWallet, CREATOR_WALLET));
    expect(row?.status).toBe("queued");
  });

  it("names a Join grant after it broadcasts", async () => {
    setDoorAlarmSender({ send: (line) => doorLines.push(line) });
    const chain = createMemoryChain();
    setSendChain(chain);
    const { eq } = await import("drizzle-orm");
    await db
      .update(schema.sends)
      .set({ status: "queued", attempts: 0, error: null, txHash: null, sentAt: null })
      .where(eq(schema.sends.toWallet, RETURNING_WALLET));
    await processQueue();
    expect(doorLines.some((line) => line.includes("Join grant sent to back"))).toBe(true);
  });
});
