import { FOR_YOU_PASS_MS, recycleForYouIds } from "@cinima/shared";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-for-you-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const ME = "NQ05FORYOUMEWALLET0000000000000001";
const PEER = "NQ05FORYOUPEERWALLET00000000000001";
const TOKEN = "test-session-for-you-pass";

const SHARED = ["movie:s1", "movie:s2", "movie:s3"] as const;
const POOL = [
  "movie:01",
  "movie:02",
  "movie:03",
  "movie:04",
  "movie:05",
  "movie:06",
  "movie:07",
  "movie:08",
  "movie:09",
  "movie:10",
  "movie:11",
  "movie:12",
  "movie:13",
  "movie:14",
  "movie:15",
  "movie:16",
  "movie:17",
  "movie:18",
  "movie:19",
  "movie:20",
] as const;

type DiscoverBody = {
  mode: string;
  suggestions: { title: { id: string } }[];
  upcoming?: { title: { id: string } }[];
};

type PassBody = {
  suggestions: { title: { id: string } }[];
  refilled: boolean;
  upcoming?: { title: { id: string } }[];
};

describe("For You Pass HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };
  let schema: typeof import("../src/db/schema.js");
  let db: Awaited<typeof import("../src/db/index.js")>["db"];

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    ({ db } = await import("../src/db/index.js"));
    schema = await import("../src/db/schema.js");
    const now = new Date();

    for (const wallet of [ME, PEER]) {
      await db.insert(schema.users).values({
        walletAddress: wallet,
        handle: wallet === ME ? "me" : "peer",
        lifetimeUnlockedAt: null,
        createdAt: now,
      });
    }
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: ME,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });

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

  async function discover(): Promise<DiscoverBody> {
    const res = await app.fetch(new Request("http://test/api/discover", { headers }));
    expect(res.status).toBe(200);
    return (await res.json()) as DiscoverBody;
  }

  it("deals five overlap titles and remembers them on reconnect", async () => {
    const first = await discover();
    expect(first.mode).toBe("overlap");
    expect(first.suggestions).toHaveLength(5);
    expect(first.suggestions.every((s) => POOL.includes(s.title.id as (typeof POOL)[number]))).toBe(
      true
    );

    const second = await discover();
    expect(second.suggestions.map((s) => s.title.id)).toEqual(
      first.suggestions.map((s) => s.title.id)
    );
  });

  it("Pass removes a Title from the set without backfill", async () => {
    const before = await discover();
    const passed = before.suggestions[0]!.title.id;

    const res = await app.fetch(
      new Request("http://test/api/discover/pass", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: passed }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as PassBody;
    expect(body.refilled).toBe(false);
    expect(body.suggestions).toHaveLength(4);
    expect(body.suggestions.map((s) => s.title.id)).not.toContain(passed);
    expect(body.suggestions.map((s) => s.title.id)).toEqual(
      before.suggestions.slice(1).map((s) => s.title.id)
    );

    const again = await discover();
    expect(again.suggestions.map((s) => s.title.id)).toEqual(
      body.suggestions.map((s) => s.title.id)
    );
  });

  it("deals a new set after the last Pass, excluding active Passes", async () => {
    let remaining = (await discover()).suggestions.map((s) => s.title.id);
    let last: PassBody | null = null;
    for (const titleId of remaining) {
      const res = await app.fetch(
        new Request("http://test/api/discover/pass", {
          method: "POST",
          headers,
          body: JSON.stringify({ titleId }),
        })
      );
      expect(res.status).toBe(200);
      last = (await res.json()) as PassBody;
    }
    expect(last?.refilled).toBe(true);
    expect(last?.suggestions).toHaveLength(5);
    const newIds = last!.suggestions.map((s) => s.title.id);
    expect(newIds.every((id) => POOL.includes(id as (typeof POOL)[number]))).toBe(true);
    expect(newIds.some((id) => remaining.includes(id))).toBe(false);
  });

  it("lets an expired Pass return in a later For You set", async () => {
    const current = (await discover()).suggestions.map((s) => s.title.id);
    const expiredId = [...POOL].find((id) => !current.includes(id))!;
    await db
      .update(schema.forYouPasses)
      .set({ passedAt: new Date(Date.now() - FOR_YOU_PASS_MS - 1000) })
      .where(
        (await import("drizzle-orm")).and(
          (await import("drizzle-orm")).eq(schema.forYouPasses.walletAddress, ME),
          (await import("drizzle-orm")).eq(schema.forYouPasses.titleId, expiredId)
        )
      );

    await db.delete(schema.forYouSets).where(
      (await import("drizzle-orm")).eq(schema.forYouSets.walletAddress, ME)
    );

    const body = await discover();
    expect(body.suggestions.map((s) => s.title.id)).toContain(expiredId);
  });

  it("Favorite drops a Title from the set without a Pass", async () => {
    const before = await discover();
    const { eq } = await import("drizzle-orm");
    const passRows = await db
      .select()
      .from(schema.forYouPasses)
      .where(eq(schema.forYouPasses.walletAddress, ME));
    const passedIds = new Set(passRows.map((row) => row.titleId));
    const titleId = before.suggestions.find((s) => !passedIds.has(s.title.id))!.title.id;
    const fav = await app.fetch(
      new Request(`http://test/api/favorites/${encodeURIComponent(titleId)}`, {
        method: "POST",
        headers,
      })
    );
    expect(fav.status).toBe(200);

    const after = await discover();
    expect(after.suggestions.map((s) => s.title.id)).not.toContain(titleId);
    expect(after.suggestions.length).toBe(before.suggestions.length - 1);

    const { and } = await import("drizzle-orm");
    const [passRow] = await db
      .select()
      .from(schema.forYouPasses)
      .where(and(eq(schema.forYouPasses.walletAddress, ME), eq(schema.forYouPasses.titleId, titleId)))
      .limit(1);
    expect(passRow).toBeUndefined();
  });

  it("Watchlist add drops a Title from the set without a Pass", async () => {
    const before = await discover();
    const titleId = before.suggestions[0]!.title.id;
    const add = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(titleId)}`, {
        method: "POST",
        headers,
      })
    );
    expect(add.status).toBe(200);

    const after = await discover();
    expect(after.suggestions.map((s) => s.title.id)).not.toContain(titleId);
  });

  it("does not deal a Title with no poster", async () => {
    const now = new Date();
    const { eq } = await import("drizzle-orm");
    await db.insert(schema.titles).values([
      {
        id: "movie:no-card",
        mediaType: "movie",
        tmdbId: 8800,
        title: "No Title Card",
        year: 2022,
        posterPath: null,
        overview: "Eligible except it has no poster",
        imdbId: null,
        rating: "9.8",
        fetchedAt: now,
        source: "seed",
      },
      {
        id: "movie:with-card",
        mediaType: "movie",
        tmdbId: 8801,
        title: "Has Title Card",
        year: 2022,
        posterPath: "/with-card.jpg",
        overview: "Eligible Catalog with a poster",
        imdbId: null,
        rating: "0.2",
        fetchedAt: now,
        source: "seed",
      },
    ]);
    const catalog = await db.select({ id: schema.titles.id }).from(schema.titles);
    await db
      .insert(schema.forYouPasses)
      .values(
        catalog
          .filter((row) => row.id !== "movie:no-card" && row.id !== "movie:with-card")
          .map((row) => ({
            walletAddress: ME,
            titleId: row.id,
            passedAt: now,
          }))
      )
      .onConflictDoUpdate({
        target: [schema.forYouPasses.walletAddress, schema.forYouPasses.titleId],
        set: { passedAt: now },
      });
    await db.delete(schema.forYouSets).where(eq(schema.forYouSets.walletAddress, ME));

    const body = await discover();
    const ids = body.suggestions.map((s) => s.title.id);
    expect(ids).not.toContain("movie:no-card");
    expect(ids).toContain("movie:with-card");
  });

  it("still deals Catalog titles after the top popular window is all Passed", async () => {
    const now = new Date();
    const leftoverId = "movie:beyond-window";
    await db.insert(schema.titles).values({
      id: leftoverId,
      mediaType: "movie",
      tmdbId: 9100,
      title: "Beyond the popular window",
      year: 2022,
      posterPath: "/beyond.jpg",
      overview: "Eligible Catalog that ranks below the popular window",
      imdbId: null,
      rating: "0.1",
      fetchedAt: now,
      source: "seed",
    });
    await db.insert(schema.titles).values(
      Array.from({ length: 240 }, (_, i) => {
        const n = String(i).padStart(3, "0");
        return {
          id: `movie:window-${n}`,
          mediaType: "movie" as const,
          tmdbId: 9200 + i,
          title: `Window ${n}`,
          year: 2022,
          posterPath: "/window.jpg",
          overview: `High-ranked Catalog title ${n}`,
          imdbId: null,
          rating: "8.5",
          fetchedAt: now,
          source: "seed",
        };
      })
    );

    const { eq } = await import("drizzle-orm");
    const catalog = await db.select({ id: schema.titles.id }).from(schema.titles);
    await db.insert(schema.forYouPasses).values(
      catalog
        .filter((row) => row.id !== leftoverId)
        .map((row) => ({
          walletAddress: ME,
          titleId: row.id,
          passedAt: now,
        }))
    ).onConflictDoUpdate({
      target: [schema.forYouPasses.walletAddress, schema.forYouPasses.titleId],
      set: { passedAt: now },
    });
    await db.delete(schema.forYouSets).where(eq(schema.forYouSets.walletAddress, ME));

    const body = await discover();
    expect(body.suggestions.map((s) => s.title.id)).toContain(leftoverId);
    expect(body.suggestions.length).toBeGreaterThan(0);
  });

  it("deals popular Catalog after overlap titles are Passed", async () => {
    const now = new Date();
    await db.insert(schema.titles).values({
      id: "movie:lonely",
      mediaType: "movie",
      tmdbId: 9001,
      title: "Lonely Popular",
      year: 2021,
      posterPath: "/lonely.jpg",
      overview: "Still in Catalog after overlap is Passed",
      imdbId: null,
      rating: "9.9",
      fetchedAt: now,
      source: "seed",
    });
    const { eq } = await import("drizzle-orm");
    for (const titleId of POOL) {
      await db
        .insert(schema.forYouPasses)
        .values({
          walletAddress: ME,
          titleId,
          passedAt: now,
        })
        .onConflictDoUpdate({
          target: [schema.forYouPasses.walletAddress, schema.forYouPasses.titleId],
          set: { passedAt: now },
        });
    }
    await db.delete(schema.forYouSets).where(eq(schema.forYouSets.walletAddress, ME));

    const body = await discover();
    expect(body.suggestions.map((s) => s.title.id)).toContain("movie:lonely");
    expect(body.suggestions.length).toBeGreaterThan(0);
  });

  it("banks the next For You set while the current set is still full", async () => {
    const { eq } = await import("drizzle-orm");
    await db.delete(schema.forYouPasses).where(eq(schema.forYouPasses.walletAddress, ME));
    await db.delete(schema.forYouSets).where(eq(schema.forYouSets.walletAddress, ME));
    const body = await discover();
    expect(body.suggestions).toHaveLength(5);
    expect((body.upcoming ?? []).length).toBe(10);
    const held = new Set(body.suggestions.map((s) => s.title.id));
    expect(body.upcoming!.every((s) => !held.has(s.title.id))).toBe(true);
  });

  it("deals the banked set when the current set empties", async () => {
    const { eq } = await import("drizzle-orm");
    await db.delete(schema.forYouPasses).where(eq(schema.forYouPasses.walletAddress, ME));
    await db.delete(schema.forYouSets).where(eq(schema.forYouSets.walletAddress, ME));
    const first = await discover();
    const banked = (first.upcoming ?? []).map((s) => s.title.id);
    expect(banked).toHaveLength(10);
    let last: PassBody | null = null;
    for (const row of first.suggestions) {
      const res = await app.fetch(
        new Request("http://test/api/discover/pass", {
          method: "POST",
          headers,
          body: JSON.stringify({ titleId: row.title.id }),
        })
      );
      expect(res.status).toBe(200);
      last = (await res.json()) as PassBody;
    }
    expect(last?.refilled).toBe(true);
    expect(last!.suggestions.map((s) => s.title.id)).toEqual(banked.slice(0, 5));
    expect((last?.upcoming ?? []).length).toBe(10);
    expect(last!.upcoming!.map((s) => s.title.id).slice(0, 5)).toEqual(banked.slice(5));
    const dealt = new Set(last!.suggestions.map((s) => s.title.id));
    expect(last!.upcoming!.every((s) => !dealt.has(s.title.id))).toBe(true);
  });

  it("includes the upcoming set on Pass once two titles remain", async () => {
    const { eq } = await import("drizzle-orm");
    await db.delete(schema.forYouPasses).where(eq(schema.forYouPasses.walletAddress, ME));
    await db.delete(schema.forYouSets).where(eq(schema.forYouSets.walletAddress, ME));
    let remaining = (await discover()).suggestions.map((s) => s.title.id);
    expect(remaining).toHaveLength(5);
    let last: PassBody | null = null;
    while (remaining.length > 2) {
      const res = await app.fetch(
        new Request("http://test/api/discover/pass", {
          method: "POST",
          headers,
          body: JSON.stringify({ titleId: remaining[0] }),
        })
      );
      expect(res.status).toBe(200);
      last = (await res.json()) as PassBody;
      remaining = last.suggestions.map((s) => s.title.id);
    }
    expect(last?.refilled).toBe(false);
    expect(last?.suggestions).toHaveLength(2);
    expect((last?.upcoming ?? []).length).toBeGreaterThan(0);
    const held = new Set(last!.suggestions.map((s) => s.title.id));
    expect(last!.upcoming!.every((s) => !held.has(s.title.id))).toBe(true);
  });

  it("peeks the next For You set without replacing the current one", async () => {
    const before = await discover();
    const res = await app.fetch(
      new Request("http://test/api/discover/for-you/upcoming", { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { suggestions: { title: { id: string } }[] };
    expect(body.suggestions.length).toBeGreaterThan(0);
    const after = await discover();
    expect(after.suggestions.map((s) => s.title.id)).toEqual(
      before.suggestions.map((s) => s.title.id)
    );
    const current = new Set(before.suggestions.map((s) => s.title.id));
    expect(body.suggestions.every((s) => !current.has(s.title.id))).toBe(true);
  });

  it("rejects a Pass for a Title that is not in the For You set", async () => {
    const res = await app.fetch(
      new Request("http://test/api/discover/pass", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: "movie:s1" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("still deals a title-card with no overview after the rest of Catalog is Passed", async () => {
    const now = new Date();
    const { eq } = await import("drizzle-orm");
    await db.insert(schema.titles).values({
      id: "movie:silent-card",
      mediaType: "movie",
      tmdbId: 9900,
      title: "Silent Card",
      year: 2022,
      posterPath: "/silent.jpg",
      overview: "",
      imdbId: null,
      rating: "0.05",
      fetchedAt: now,
      source: "seed",
    });
    await db.delete(schema.forYouPasses).where(eq(schema.forYouPasses.walletAddress, ME));
    await db.delete(schema.forYouSets).where(eq(schema.forYouSets.walletAddress, ME));
    const catalog = await db.select({ id: schema.titles.id }).from(schema.titles);
    await db.insert(schema.forYouPasses).values(
      catalog
        .filter((row) => row.id !== "movie:silent-card")
        .map((row) => ({
          walletAddress: ME,
          titleId: row.id,
          passedAt: now,
        }))
    );
    const body = await discover();
    expect(body.suggestions.map((s) => s.title.id)).toContain("movie:silent-card");
    expect(body.suggestions.length).toBeGreaterThan(0);
  });

  it("deals the oldest Passed titles again when every title-card is Passed", async () => {
    const now = new Date();
    const { eq } = await import("drizzle-orm");
    await db.delete(schema.forYouPasses).where(eq(schema.forYouPasses.walletAddress, ME));
    await db.delete(schema.forYouSets).where(eq(schema.forYouSets.walletAddress, ME));
    const catalog = await db.select({ id: schema.titles.id }).from(schema.titles);
    const passable = catalog.filter((row) => !SHARED.includes(row.id as (typeof SHARED)[number]));
    await db.insert(schema.forYouPasses).values(
      passable.map((row, i) => ({
        walletAddress: ME,
        titleId: row.id,
        passedAt: new Date(now.getTime() - (passable.length - i) * 1000),
      }))
    );
    const body = await discover();
    expect(body.suggestions.length).toBe(5);
    expect(body.suggestions.every((s) => Boolean(s.title.posterUrl))).toBe(true);
    const again = await discover();
    expect(again.suggestions.map((s) => s.title.id)).toEqual(
      body.suggestions.map((s) => s.title.id)
    );
  });
});

describe("recycleForYouIds", () => {
  it("deals the oldest Passed titles that are not Favorites or Watchlist", () => {
    expect(recycleForYouIds(["a", "b", "c", "d", "e", "f"], new Set(["b"]), 5)).toEqual([
      "a",
      "c",
      "d",
      "e",
      "f",
    ]);
  });
});
