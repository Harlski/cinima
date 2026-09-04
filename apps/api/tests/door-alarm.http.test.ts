import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-door-alarm-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.WEB_ORIGIN = "https://cinima.app";
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;

const WALLET = "NQ05DOORALARMTESTWALLET00000000001";
const TOKEN = "test-session-token-door-alarm";
const TITLE_ID = "tmdb:movie:550";

describe("Door alarm HTTP write path", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };
  let setDoorAlarmSender: (typeof import("../src/services/doorAlarm.js"))["setDoorAlarmSender"];
  let resetDoorAlarmSender: (typeof import("../src/services/doorAlarm.js"))["resetDoorAlarmSender"];
  const lines: string[] = [];

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const now = new Date();

    await db.insert(schema.users).values({
      walletAddress: WALLET,
      handle: "alice",
      lifetimeUnlockedAt: null,
      createdAt: now,
    });
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: WALLET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });
    await db.insert(schema.titles).values({
      id: TITLE_ID,
      mediaType: "movie",
      tmdbId: 550,
      title: "Fight Club",
      year: 1999,
      posterPath: "/poster.jpg",
      overview: "fixture",
      imdbId: "tt0137523",
      rating: "8.4",
      fetchedAt: now,
      source: "seed",
    });

    const doorAlarm = await import("../src/services/doorAlarm.js");
    setDoorAlarmSender = doorAlarm.setDoorAlarmSender;
    resetDoorAlarmSender = doorAlarm.resetDoorAlarmSender;
    app = (await import("../src/app.js")).app;
  });

  beforeEach(() => {
    lines.length = 0;
    setDoorAlarmSender({
      send(line) {
        lines.push(line);
      },
    });
  });

  afterEach(() => {
    resetDoorAlarmSender();
  });

  it("rings after a recorded session create", async () => {
    const challenge = await app.fetch(
      new Request("http://test/api/auth/challenge", {
        headers: { "X-Cinima-Demo": "1" },
      })
    );
    const { nonce, message } = (await challenge.json()) as {
      nonce: string;
      message: string;
    };

    const res = await app.fetch(
      new Request("http://test/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Cinima-Demo": "1" },
        body: JSON.stringify({
          nonce,
          message,
          signerPublicKey: "demo",
          signature: "demo",
          demoWallet: WALLET,
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(lines).toEqual(["alice signed in"]);
  });

  it("rings after a recorded search and not after a duplicate", async () => {
    const first = await app.fetch(
      new Request("http://test/api/usage/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: "  Dune  " }),
      })
    );
    expect(first.status).toBe(200);
    expect(lines).toEqual(['alice searched "dune"']);

    const second = await app.fetch(
      new Request("http://test/api/usage/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: "dune" }),
      })
    );
    expect(second.status).toBe(200);
    expect(lines).toEqual(['alice searched "dune"']);
  });

  it("rings after a recorded title view and not after a duplicate", async () => {
    const first = await app.fetch(
      new Request("http://test/api/usage/view", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: TITLE_ID }),
      })
    );
    expect(first.status).toBe(200);
    expect(lines).toEqual(["alice viewed Fight Club"]);

    const second = await app.fetch(
      new Request("http://test/api/usage/view", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: TITLE_ID }),
      })
    );
    expect(second.status).toBe(200);
    expect(lines).toEqual(["alice viewed Fight Club"]);
  });

  it("rings when a Title Share link is created, not when it already exists", async () => {
    const first = await app.fetch(
      new Request("http://test/api/share/title", {
        method: "POST",
        headers,
        body: JSON.stringify({ mediaType: "movie", tmdbId: 550 }),
      })
    );
    expect(first.status).toBe(200);
    expect(lines).toEqual(["alice shared Fight Club"]);

    const second = await app.fetch(
      new Request("http://test/api/share/title", {
        method: "POST",
        headers,
        body: JSON.stringify({ mediaType: "movie", tmdbId: 550 }),
      })
    );
    expect(second.status).toBe(200);
    expect(lines).toEqual(["alice shared Fight Club"]);
  });

  it("rings when a Public Profile share link is created, not when it already exists", async () => {
    const first = await app.fetch(
      new Request("http://test/api/share/profile", {
        method: "POST",
        headers,
      })
    );
    expect(first.status).toBe(200);
    expect(lines).toEqual(["alice shared their profile"]);

    const second = await app.fetch(
      new Request("http://test/api/share/profile", {
        method: "POST",
        headers,
      })
    );
    expect(second.status).toBe(200);
    expect(lines).toEqual(["alice shared their profile"]);
  });

  it("rings when a Watchlist Share link is created, not when it already exists", async () => {
    const add = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    expect(add.status).toBe(200);

    const first = await app.fetch(
      new Request("http://test/api/share/watchlist", {
        method: "POST",
        headers,
      })
    );
    expect(first.status).toBe(200);
    expect(lines).toEqual(["alice shared their Watchlist"]);

    const second = await app.fetch(
      new Request("http://test/api/share/watchlist", {
        method: "POST",
        headers,
      })
    );
    expect(second.status).toBe(200);
    expect(lines).toEqual(["alice shared their Watchlist"]);
  });

  it("still returns 200 when the Door alarm sender throws", async () => {
    setDoorAlarmSender({
      send() {
        throw new Error("telegram down");
      },
    });
    const res = await app.fetch(
      new Request("http://test/api/usage/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: "arrival" }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
