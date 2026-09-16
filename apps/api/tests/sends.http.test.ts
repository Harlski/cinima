import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { CREATOR_WALLET, PING_LUNA, REWARD_LUNA } from "@cinima/shared";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-sends-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const ME = "NQ05SENDSTESTWALLETME000000000001";
const PEER = "NQ05SENDSTESTWALLETPEER000000001";
const LAPSED = "NQ05SENDSTESTWALLETLAPSED0000001";
const TOKEN = "test-session-token-sends";
const CREATOR_TOKEN = "test-session-token-sends-creator";
const TITLE_A = "tmdb:movie:550";
const TITLE_B = "tmdb:movie:278";
const TITLE_C = "tmdb:movie:13";
const TITLE_D = "tmdb:movie:238";
const TITLE_E = "tmdb:movie:157336";
const TITLE_F = "tmdb:movie:424";

describe("Sends", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };
  let db: typeof import("../src/db/index.js").db;
  let schema: typeof import("../src/db/schema.js");
  let setSendChain: typeof import("../src/services/sends.js").setSendChain;
  let processQueue: typeof import("../src/services/sends.js").processQueue;
  let planSystemPings: typeof import("../src/services/sends.js").planSystemPings;
  let listRecentSends: typeof import("../src/services/sends.js").listRecentSends;
  let createMemoryChain: typeof import("../src/services/sendsChain.js").createMemoryChain;
  let setDoorAlarmSender: (typeof import("../src/services/doorAlarm.js"))["setDoorAlarmSender"];
  let resetDoorAlarmSender: (typeof import("../src/services/doorAlarm.js"))["resetDoorAlarmSender"];
  const doorLines: string[] = [];

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };
  const creatorHeaders = {
    Authorization: `Bearer ${CREATOR_TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    db = (await import("../src/db/index.js")).db;
    schema = await import("../src/db/schema.js");
    const sends = await import("../src/services/sends.js");
    setSendChain = sends.setSendChain;
    processQueue = sends.processQueue;
    planSystemPings = sends.planSystemPings;
    listRecentSends = sends.listRecentSends;
    createMemoryChain = (await import("../src/services/sendsChain.js")).createMemoryChain;
    const doorAlarm = await import("../src/services/doorAlarm.js");
    setDoorAlarmSender = doorAlarm.setDoorAlarmSender;
    resetDoorAlarmSender = doorAlarm.resetDoorAlarmSender;
    const now = new Date();
    await db.insert(schema.users).values([
      { walletAddress: ME, handle: "meuser", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: PEER, handle: "peera", lifetimeUnlockedAt: null, createdAt: now },
      {
        walletAddress: LAPSED,
        handle: "away",
        lifetimeUnlockedAt: null,
        createdAt: new Date(now.getTime() - 40 * 86400000),
        guidedTourCompletedAt: new Date(now.getTime() - 30 * 86400000),
      },
      {
        walletAddress: CREATOR_WALLET,
        handle: "cinima",
        lifetimeUnlockedAt: null,
        createdAt: now,
      },
    ]);
    await db.insert(schema.sessions).values([
      {
        token: TOKEN,
        walletAddress: ME,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
      {
        token: CREATOR_TOKEN,
        walletAddress: CREATOR_WALLET,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
    ]);
    const titles = [
      { id: TITLE_A, tmdbId: 550, title: "Fight Club" },
      { id: TITLE_B, tmdbId: 278, title: "The Shawshank Redemption" },
      { id: TITLE_C, tmdbId: 13, title: "Forrest Gump" },
      { id: TITLE_D, tmdbId: 238, title: "The Godfather" },
      { id: TITLE_E, tmdbId: 157336, title: "Interstellar" },
      { id: TITLE_F, tmdbId: 424, title: "Schindler's List" },
    ];
    await db.insert(schema.titles).values(
      titles.map((t) => ({
        id: t.id,
        mediaType: "movie",
        tmdbId: t.tmdbId,
        title: t.title,
        year: 1999,
        posterPath: null,
        overview: "fixture",
        imdbId: null,
        rating: "8.0",
        fetchedAt: now,
        source: "seed",
      }))
    );
    await db.insert(schema.favorites).values(
      titles.map((t) => ({
        walletAddress: PEER,
        titleId: t.id,
        createdAt: now,
        recommendedAt: null,
      }))
    );
    app = (await import("../src/app.js")).app;
  });

  afterEach(() => {
    setSendChain(null);
    doorLines.length = 0;
    resetDoorAlarmSender();
  });

  async function thank(titleId: string) {
    return app.fetch(
      new Request("http://test/api/thanks", {
        method: "POST",
        headers,
        body: JSON.stringify({ toWallet: PEER, titleId }),
      })
    );
  }

  it("attaches a Reward to Thanks under the daily cap", async () => {
    const chain = createMemoryChain();
    setSendChain(chain);
    const res = await thank(TITLE_A);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { rewarded: boolean }).rewarded).toBe(true);
    const processed = await processQueue();
    expect(processed.sent).toBe(1);
    expect(chain.sent[0]).toEqual({
      to: PEER,
      luna: REWARD_LUNA,
      memo: "meuser thanked you on Cinima",
    });
  });

  it("rings Door alarm when a Ping broadcasts", async () => {
    setDoorAlarmSender({
      send(line) {
        doorLines.push(line);
      },
    });
    const chain = createMemoryChain();
    setSendChain(chain);
    const queued = await app.fetch(
      new Request("http://test/api/sends", {
        method: "POST",
        headers: creatorHeaders,
        body: JSON.stringify({ handle: "peera", message: "come back" }),
      })
    );
    expect(queued.status).toBe(200);
    expect(doorLines).toEqual([]);
    const processed = await processQueue();
    expect(processed.sent).toBeGreaterThan(0);
    expect(doorLines.some((line) => line === "Ping sent to peera: Cinima.app - come back")).toBe(
      true
    );
  });

  it("keeps the sixth Thanks social-only", async () => {
    const chain = createMemoryChain();
    setSendChain(chain);
    for (const id of [TITLE_B, TITLE_C, TITLE_D, TITLE_E]) {
      const res = await thank(id);
      expect(((await res.json()) as { rewarded: boolean }).rewarded).toBe(true);
    }
    const sixth = await thank(TITLE_F);
    expect(sixth.status).toBe(200);
    const sixthBody = (await sixth.json()) as { rewarded: boolean; created: boolean };
    expect(sixthBody.created).toBe(true);
    expect(sixthBody.rewarded).toBe(false);
  });

  it("Thank all spends remaining Rewards then Thanks the rest", async () => {
    const thanker = "NQ05SENDSTESTWALLETTHANKALL00001";
    const peerX = "NQ05SENDSTESTWALLETPEERX00000001";
    const peerY = "NQ05SENDSTESTWALLETPEERY00000001";
    const extraTitle = "tmdb:movie:680";
    const thankerToken = "test-session-token-sends-thankall";
    const now = new Date();
    await db.insert(schema.users).values([
      { walletAddress: thanker, handle: "alluser", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: peerX, handle: "peerx", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: peerY, handle: "peery", lifetimeUnlockedAt: null, createdAt: now },
    ]);
    await db.insert(schema.sessions).values({
      token: thankerToken,
      walletAddress: thanker,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });
    await db.insert(schema.titles).values({
      id: extraTitle,
      mediaType: "movie",
      tmdbId: 680,
      title: "Pulp Fiction",
      year: 1994,
      posterPath: null,
      overview: "fixture",
      imdbId: null,
      rating: "8.0",
      fetchedAt: now,
      source: "seed",
    });
    await db.insert(schema.favorites).values([
      { walletAddress: peerX, titleId: extraTitle, createdAt: now, recommendedAt: null },
      { walletAddress: peerY, titleId: extraTitle, createdAt: now, recommendedAt: null },
    ]);
    const res = await app.fetch(
      new Request("http://test/api/thanks/all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${thankerToken}`,
          "Content-Type": "application/json",
          "X-Cinima-Demo": "1",
        },
        body: JSON.stringify({ titleId: extraTitle }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { thanked: number; rewarded: number };
    expect(body.thanked).toBe(2);
    expect(body.rewarded).toBe(2);
  });

  it("plans a Watchlist System Ping for a lapsed Handle", async () => {
    const now = Date.now();
    await db.insert(schema.presenceDays).values({
      walletAddress: LAPSED,
      day: "2026-08-01",
      activeMs: 60_000,
      lastHeartbeatAt: new Date(now - 10 * 86400000),
    });
    await db.insert(schema.watchlist).values({
      walletAddress: LAPSED,
      titleId: TITLE_A,
      createdAt: new Date(now - 20 * 86400000),
      sortOrder: 0,
    });
    const queued = await planSystemPings(new Date(now));
    expect(queued).toBe(1);
    const recent = await listRecentSends();
    const ping = recent.find((s) => s.toWallet === LAPSED && s.source === "system");
    expect(ping?.memo).toBe("Cinima.app - Have you watched: Fight Club yet?");
    expect(ping?.luna).toBe(PING_LUNA);
  });

  it("skips Quiet Handles for System Pings", async () => {
    const quietWallet = "NQ05SENDSTESTWALLETQUIET00000001";
    const now = Date.now();
    const presence = new Date(now - 10 * 86400000);
    await db.insert(schema.users).values({
      walletAddress: quietWallet,
      handle: "quiet",
      lifetimeUnlockedAt: null,
      createdAt: new Date(now - 40 * 86400000),
      guidedTourCompletedAt: new Date(now - 30 * 86400000),
    });
    await db.insert(schema.presenceDays).values({
      walletAddress: quietWallet,
      day: "2026-08-01",
      activeMs: 60_000,
      lastHeartbeatAt: presence,
    });
    await db.insert(schema.watchlist).values({
      walletAddress: quietWallet,
      titleId: TITLE_A,
      createdAt: new Date(now - 20 * 86400000),
      sortOrder: 0,
    });
    await db.insert(schema.sends).values(
      [1, 2, 3].map((n) => ({
        kind: "ping",
        source: "system",
        toWallet: quietWallet,
        luna: PING_LUNA,
        memo: `Cinima.app - prior ${n}`,
        status: "sent",
        idempotencyKey: `system-quiet-${n}`,
        createdAt: new Date(presence.getTime() + n * 86400000),
        attempts: 1,
      }))
    );
    const queued = await planSystemPings(new Date(now));
    expect(queued).toBe(0);
  });

  it("lets the Creator enqueue a Ping to themselves", async () => {
    const res = await app.fetch(
      new Request("http://test/api/sends/self", {
        method: "POST",
        headers: creatorHeaders,
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { queued: boolean; memo: string };
    expect(body.queued).toBe(true);
    expect(body.memo).toBe("Cinima.app - Sender test");
  });

  it("hides the Creator self Ping from a non-Creator", async () => {
    const res = await app.fetch(
      new Request("http://test/api/sends/self", {
        method: "POST",
        headers,
      })
    );
    expect(res.status).toBe(404);
  });

  it("lets the Creator enqueue a Ping", async () => {
    const res = await app.fetch(
      new Request("http://test/api/sends", {
        method: "POST",
        headers: creatorHeaders,
        body: JSON.stringify({ toWallet: PEER, message: "come back" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { queued: boolean; queuedCount: number; memo: string };
    expect(body.queued).toBe(true);
    expect(body.queuedCount).toBe(1);
    expect(body.memo).toBe("Cinima.app - come back");
  });

  it("lets the Creator enqueue a Ping by Handle", async () => {
    const res = await app.fetch(
      new Request("http://test/api/sends", {
        method: "POST",
        headers: creatorHeaders,
        body: JSON.stringify({ handle: "peera", message: "hello peera" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { queuedCount: number; memo: string };
    expect(body.queuedCount).toBe(1);
    expect(body.memo).toBe("Cinima.app - hello peera");
  });

  it("lets the Creator enqueue one Ping to many Handles", async () => {
    const res = await app.fetch(
      new Request("http://test/api/sends", {
        method: "POST",
        headers: creatorHeaders,
        body: JSON.stringify({ handles: ["meuser", "peera"], message: "watch this" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { queued: boolean; queuedCount: number; memo: string };
    expect(body.queued).toBe(true);
    expect(body.queuedCount).toBe(2);
    expect(body.memo).toBe("Cinima.app - watch this");
  });

  it("lets the Creator enqueue a Ping to Everyone", async () => {
    const people = await db.select({ walletAddress: schema.users.walletAddress }).from(schema.users);
    const res = await app.fetch(
      new Request("http://test/api/sends", {
        method: "POST",
        headers: creatorHeaders,
        body: JSON.stringify({ everyone: true, message: "hello all" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { queued: boolean; queuedCount: number; memo: string };
    expect(body.queued).toBe(true);
    expect(body.queuedCount).toBe(people.length);
    expect(body.memo).toBe("Cinima.app - hello all");
  });

  it("suggests Handles as the Creator types", async () => {
    const res = await app.fetch(
      new Request("http://test/api/sends/handles?q=peera", { headers: creatorHeaders })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { handles: { handle: string; walletAddress: string }[] };
    expect(body.handles).toEqual([{ handle: "peera", walletAddress: PEER }]);
  });

  it("hides Handle suggestions from a non-Creator", async () => {
    const res = await app.fetch(new Request("http://test/api/sends/handles?q=peer", { headers }));
    expect(res.status).toBe(404);
  });

  it("hides Creator Ping from a non-Creator", async () => {
    const res = await app.fetch(
      new Request("http://test/api/sends", {
        method: "POST",
        headers,
        body: JSON.stringify({ toWallet: PEER, message: "nope" }),
      })
    );
    expect(res.status).toBe(404);
  });

  it("plans a new-users System Ping when Watchlist is empty", async () => {
    const target = "NQ05SENDSTESTWALLETNEWUSERS00001";
    const now = Date.now();
    const presence = new Date(now - 10 * 86400000);
    await db.insert(schema.users).values({
      walletAddress: target,
      handle: "lapsed2",
      lifetimeUnlockedAt: null,
      createdAt: new Date(now - 40 * 86400000),
      guidedTourCompletedAt: new Date(now - 30 * 86400000),
    });
    await db.insert(schema.presenceDays).values({
      walletAddress: target,
      day: "2026-08-01",
      activeMs: 60_000,
      lastHeartbeatAt: presence,
    });
    await db.insert(schema.users).values(
      [1, 2, 3].map((n) => ({
        walletAddress: `NQ05SENDSTESTWALLETNEWBIE000000${n}`,
        handle: `new${n}`,
        lifetimeUnlockedAt: null,
        createdAt: new Date(presence.getTime() + n * 86400000),
      }))
    );
    const queued = await planSystemPings(new Date(now));
    expect(queued).toBeGreaterThanOrEqual(1);
    const recent = await listRecentSends();
    const ping = recent.find((s) => s.toWallet === target && s.source === "system");
    expect(ping?.memo).toMatch(/^Cinima\.app - \d+ new users since last visit$/);
    expect(ping?.luna).toBe(PING_LUNA);
  });

  it("attaches a Reward to Comment Thanks under the cap", async () => {
    const thanker = "NQ05SENDSTESTWALLETCMTTHANK00001";
    const token = "test-session-token-sends-cmtthank";
    const now = new Date();
    await db.insert(schema.users).values({
      walletAddress: thanker,
      handle: "cmtuser",
      lifetimeUnlockedAt: null,
      createdAt: now,
    });
    await db.insert(schema.sessions).values({
      token,
      walletAddress: thanker,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });
    const inserted = await db
      .insert(schema.comments)
      .values({
        titleId: TITLE_A,
        walletAddress: PEER,
        body: "loved it",
        txHash: "",
        createdAt: now,
      })
      .returning({ id: schema.comments.id });
    const res = await app.fetch(
      new Request(`http://test/api/comments/${inserted[0]!.id}/thanks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Cinima-Demo": "1",
        },
      })
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { rewarded: boolean }).rewarded).toBe(true);
  });
});
