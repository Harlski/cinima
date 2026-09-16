import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-for-you-tour-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const ME = "NQ05FORYOUTOURMEWALLET00000000001";
const PEER = "NQ05FORYOUTOURPEERWALLET000000001";
const SKIPPER = "NQ05FORYOUTOURSKIPWALLET00000001";
const TOKEN = "test-session-for-you-tour";
const SKIP_TOKEN = "test-session-for-you-tour-skip";

const SHARED = ["movie:s1", "movie:s2", "movie:s3"] as const;
const POOL = Array.from({ length: 16 }, (_, i) => `movie:${String(i + 1).padStart(2, "0")}`);

type DiscoverBody = {
  mode: string;
  suggestions: { title: { id: string } }[];
};

type PassBody = {
  suggestions: { title: { id: string } }[];
  refilled: boolean;
  upcoming?: { title: { id: string } }[];
};

describe("Guided tour For You Pass HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };
  let schema: typeof import("../src/db/schema.js");
  let db: Awaited<typeof import("../src/db/index.js")>["db"];

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  const skipHeaders = {
    Authorization: `Bearer ${SKIP_TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    ({ db } = await import("../src/db/index.js"));
    schema = await import("../src/db/schema.js");
    const now = new Date();

    for (const wallet of [ME, PEER, SKIPPER]) {
      await db.insert(schema.users).values({
        walletAddress: wallet,
        handle: wallet === PEER ? "peer" : wallet === SKIPPER ? "skip" : "me",
        lifetimeUnlockedAt: null,
        createdAt: now,
      });
    }
    await db.insert(schema.sessions).values([
      {
        token: TOKEN,
        walletAddress: ME,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
      {
        token: SKIP_TOKEN,
        walletAddress: SKIPPER,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
    ]);

    let tmdb = 1;
    for (const id of [...SHARED, ...POOL]) {
      await db.insert(schema.titles).values({
        id,
        mediaType: "movie",
        tmdbId: tmdb++,
        title: id,
        year: 2020,
        posterPath: `/${id}.jpg`,
        overview: `Overview for ${id}`,
        imdbId: null,
        rating: "7.0",
        fetchedAt: now,
        source: "seed",
      });
    }

    for (const titleId of SHARED) {
      await db.insert(schema.favorites).values({
        walletAddress: ME,
        titleId,
        createdAt: now,
        recommendedAt: null,
      });
      await db.insert(schema.favorites).values({
        walletAddress: SKIPPER,
        titleId,
        createdAt: now,
        recommendedAt: null,
      });
    }

    for (const titleId of [...SHARED, ...POOL]) {
      await db.insert(schema.favorites).values({
        walletAddress: PEER,
        titleId,
        createdAt: now,
        recommendedAt: now,
      });
    }

    app = (await import("../src/app.js")).app;
  });

  async function discover(auth = headers): Promise<DiscoverBody> {
    const res = await app.fetch(new Request("http://test/api/discover", { headers: auth }));
    expect(res.status).toBe(200);
    return (await res.json()) as DiscoverBody;
  }

  async function stage(auth = headers): Promise<DiscoverBody> {
    const res = await app.fetch(
      new Request("http://test/api/discover/for-you/tour-stage", {
        method: "POST",
        headers: auth,
      })
    );
    expect(res.status).toBe(200);
    return (await res.json()) as DiscoverBody;
  }

  it("stages one teaching card and deals five new titles after that Pass", async () => {
    const before = await discover();
    expect(before.suggestions).toHaveLength(5);
    const original = before.suggestions.map((s) => s.title.id);
    const teachingId = original[Math.floor((original.length - 1) / 2)]!;
    const holdOut = original.filter((id) => id !== teachingId);

    const staged = await stage();
    expect(staged.suggestions.map((s) => s.title.id)).toEqual([teachingId]);

    const stagedAgain = await stage();
    expect(stagedAgain.suggestions.map((s) => s.title.id)).toEqual([teachingId]);

    const upcoming = await app.fetch(
      new Request("http://test/api/discover/for-you/upcoming", { headers })
    );
    expect(upcoming.status).toBe(200);
    const upcomingIds = (
      (await upcoming.json()) as { suggestions: { title: { id: string } }[] }
    ).suggestions.map((s) => s.title.id);
    expect(upcomingIds.some((id) => holdOut.includes(id))).toBe(false);

    const res = await app.fetch(
      new Request("http://test/api/discover/pass", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: teachingId }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as PassBody;
    expect(body.refilled).toBe(true);
    expect(body.suggestions).toHaveLength(5);
    const nextIds = body.suggestions.map((s) => s.title.id);
    expect(nextIds).not.toContain(teachingId);
    expect(nextIds.some((id) => holdOut.includes(id))).toBe(false);
  });

  it("restores the held-out titles when the Guided tour is skipped", async () => {
    const before = await discover(skipHeaders);
    expect(before.suggestions).toHaveLength(5);
    const original = before.suggestions.map((s) => s.title.id);
    const teachingId = original[Math.floor((original.length - 1) / 2)]!;

    const staged = await stage(skipHeaders);
    expect(staged.suggestions.map((s) => s.title.id)).toEqual([teachingId]);

    const skip = await app.fetch(
      new Request("http://test/api/tour/skip", {
        method: "POST",
        headers: skipHeaders,
      })
    );
    expect(skip.status).toBe(200);

    const restored = await discover(skipHeaders);
    expect(restored.suggestions.map((s) => s.title.id)).toEqual(original);
  });
});
