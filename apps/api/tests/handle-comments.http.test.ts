import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-handle-comments-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.WEB_ORIGIN = "https://cinima.app";

const ME = "NQ05HANDLECOMMENTSME00000000000001";
const PEER = "NQ05HANDLECOMMENTSPEER00000000002";
const OTHER = "NQ05HANDLECOMMENTSOTHER0000000003";
const TOKEN_ME = "test-session-token-handle-comments-me";
const TOKEN_PEER = "test-session-token-handle-comments-peer";
const MOVIE_ID = "tmdb:movie:550";
const TV_ID = "tmdb:tv:1396";

describe("Handle Comments HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  const meHeaders = {
    Authorization: `Bearer ${TOKEN_ME}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  const peerHeaders = {
    Authorization: `Bearer ${TOKEN_PEER}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const now = Date.now();

    await db.insert(schema.users).values([
      { walletAddress: ME, handle: "meuser", lifetimeUnlockedAt: null, createdAt: new Date(now) },
      { walletAddress: PEER, handle: "peeruser", lifetimeUnlockedAt: null, createdAt: new Date(now) },
    ]);
    await db.insert(schema.sessions).values([
      {
        token: TOKEN_ME,
        walletAddress: ME,
        expiresAt: new Date(now + 60 * 60 * 1000),
        createdAt: new Date(now),
      },
      {
        token: TOKEN_PEER,
        walletAddress: PEER,
        expiresAt: new Date(now + 60 * 60 * 1000),
        createdAt: new Date(now),
      },
    ]);
    await db.insert(schema.titles).values([
      {
        id: MOVIE_ID,
        mediaType: "movie",
        tmdbId: 550,
        title: "Fight Club",
        year: 1999,
        posterPath: null,
        overview: "fixture",
        imdbId: "tt0137523",
        rating: "8.4",
        fetchedAt: new Date(now),
        source: "seed",
      },
      {
        id: TV_ID,
        mediaType: "tv",
        tmdbId: 1396,
        title: "Breaking Bad",
        year: 2008,
        posterPath: null,
        overview: "fixture",
        imdbId: "tt0903747",
        rating: "9.5",
        fetchedAt: new Date(now),
        source: "seed",
      },
    ]);

    const peerBodies = [
      "Take seven",
      "Take six",
      "Take five",
      "Take four",
      "Take three",
      "Take two",
      "Take one",
    ];
    await db.insert(schema.comments).values([
      ...peerBodies.map((body, i) => ({
        titleId: i % 2 === 0 ? MOVIE_ID : TV_ID,
        walletAddress: PEER,
        body,
        txHash: "",
        createdAt: new Date(now - i * 60_000),
      })),
      {
        titleId: MOVIE_ID,
        walletAddress: PEER,
        body: "Gone from profile",
        txHash: "",
        createdAt: new Date(now - 8 * 60_000),
        deletedAt: new Date(now - 7 * 60_000),
      },
      {
        titleId: MOVIE_ID,
        walletAddress: ME,
        body: "Not the peer",
        txHash: "",
        createdAt: new Date(now + 60_000),
      },
    ]);

    app = (await import("../src/app.js")).app;
  });

  it("lists a Handle's newest live Comments with Title, not other Handles or deleted", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(PEER)}/comments`, {
        headers: meHeaders,
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: {
        body: string;
        walletAddress: string;
        handle: string | null;
        deleted: boolean;
        title: { id: string; title: string };
      }[];
      hasMore: boolean;
    };
    expect(body.items.map((i) => i.body)).toEqual([
      "Take seven",
      "Take six",
      "Take five",
      "Take four",
      "Take three",
    ]);
    expect(body.hasMore).toBe(true);
    expect(body.items.every((i) => i.walletAddress === PEER)).toBe(true);
    expect(body.items.every((i) => i.deleted === false)).toBe(true);
    expect(body.items[0]).toMatchObject({
      handle: "peeruser",
      title: { id: MOVIE_ID, title: "Fight Club" },
    });
    expect(body.items[1]).toMatchObject({
      title: { id: TV_ID, title: "Breaking Bad" },
    });
  });

  it("returns the next page of 5 live Comments", async () => {
    const res = await app.fetch(
      new Request(
        `http://test/api/users/${encodeURIComponent(PEER)}/comments?limit=5&offset=5`,
        { headers: meHeaders }
      )
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { body: string }[]; hasMore: boolean };
    expect(body.items.map((i) => i.body)).toEqual(["Take two", "Take one"]);
    expect(body.hasMore).toBe(false);
  });

  it("rejects unauthenticated readers", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(PEER)}/comments`)
    );
    expect(res.status).toBe(401);
  });

  it("returns not found for an unknown wallet", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(OTHER)}/comments`, {
        headers: meHeaders,
      })
    );
    expect(res.status).toBe(404);
  });

  it("does not put Comments on Public Profile", async () => {
    const res = await app.fetch(new Request("http://test/api/public/peeruser"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.handle).toBe("peeruser");
    expect(body).not.toHaveProperty("comments");
    expect(body).not.toHaveProperty("items");

    const guessed = await app.fetch(new Request("http://test/api/public/peeruser/comments"));
    expect(guessed.status).toBe(404);
  });

  it("lets a Handle read their own Comments", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(ME)}/comments`, {
        headers: peerHeaders,
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { body: string; walletAddress: string }[] };
    expect(body.items.map((i) => i.body)).toEqual(["Not the peer"]);
    expect(body.items[0]?.walletAddress).toBe(ME);
  });
});
