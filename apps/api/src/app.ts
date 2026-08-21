import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  COMMENT_LUNA,
  LIFETIME_UNLOCK_LUNA,
  UNLOCK_LUNA,
  normalizeWallet,
  type ActivityItem,
  type CommentDto,
  type EpisodeCell,
  type GatePayload,
  type MeResponse,
  type PricesResponse,
  type PublicProfile,
  type SessionUser,
  type TitleDetail,
} from "@nimcharts/shared";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
import { config } from "./lib/config.js";
import { bearerToken, isPayContext } from "./lib/util.js";
import { toTitleSummary } from "./lib/titles.js";
import { searchCatalog, ensureTitleFresh, getEpisodesForTitle } from "./services/catalog.js";
import { verifyPayment } from "./services/payments.js";
import { lookupWalletByHandle } from "./services/nimconnect.js";
import {
  activityHeatmap,
  followCounts,
  followUser,
  followingFeed,
  isFollowing,
  unfollowUser,
} from "./services/follow.js";
import {
  SocialTasteError,
  addFavorite,
  clearRecommend,
  discoverFor,
  favoriteCount,
  isFavorited,
  isRecommended,
  listFavorites,
  listRecommends,
  removeFavorite,
  setRecommend,
} from "./services/favorites.js";
import type { FollowingFeedResponse } from "@nimcharts/shared";

type Vars = {
  user: typeof schema.users.$inferSelect;
  sessionUser: SessionUser;
  payContext: boolean;
};

const app = new Hono<{ Variables: Vars }>();

app.use(
  "*",
  cors({
    origin: (o) => o || "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Nimcharts-Pay", "X-Nimcharts-Demo"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use("*", async (c, next) => {
  const demoQ = c.req.query("demo");
  c.set("payContext", isPayContext(c.req.raw.headers, demoQ) || config.demoMode);
  await next();
});

function demoTxOk(hash: string): boolean {
  return config.demoMode && (hash.startsWith("demo:") || hash.startsWith("dev:"));
}

async function assertPayment(opts: Parameters<typeof verifyPayment>[0]) {
  if (demoTxOk(opts.txHash) || (config.demoMode && opts.txHash)) {
    return verifyPayment({ ...opts, txHash: opts.txHash.startsWith("demo:") || opts.txHash.startsWith("dev:") ? opts.txHash : `demo:${opts.txHash}` });
  }
  return verifyPayment(opts);
}

const requirePay = async (c: any, next: any) => {
  if (!c.get("payContext") && !config.demoMode) {
    const payload: GatePayload = {
      gate: true,
      message: "NimCharts runs inside Nimiq Pay.",
      openInPayUrl: "https://www.nimiq.com/pay/",
    };
    return c.json(payload, 403);
  }
  await next();
};

const requireAuth = async (c: any, next: any) => {
  const token = bearerToken(c.req.raw.headers);
  if (!token) return c.json({ error: "unauthorized" }, 401);

  const session = await db.query.sessions.findFirst({
    where: eq(schema.sessions.token, token),
  });
  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "invalid_session" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.walletAddress, session.walletAddress),
  });
  if (!user) return c.json({ error: "user_not_found" }, 404);

  const favCount = await favoriteCount(user.walletAddress);

  c.set("user", user);
  c.set("sessionUser", {
    walletAddress: user.walletAddress,
    handle: user.handle,
    lifetimeUnlocked: user.lifetimeUnlockedAt != null,
    favoriteCount: favCount,
  } satisfies SessionUser);
  await next();
};

async function sessionUserFor(walletAddress: string): Promise<SessionUser> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.walletAddress, walletAddress),
  });
  const favCount = await favoriteCount(walletAddress);
  return {
    walletAddress,
    handle: user?.handle ?? null,
    lifetimeUnlocked: user?.lifetimeUnlockedAt != null,
    favoriteCount: favCount,
  };
}

app.get("/health", (c) => c.json({ ok: true, demoMode: config.demoMode }));

app.get("/api/gate", (c) => {
  if (c.get("payContext") || config.demoMode) return c.json({ gate: false });
  return c.json({
    gate: true,
    message: "NimCharts runs inside Nimiq Pay.",
    openInPayUrl: "https://www.nimiq.com/pay/",
  } satisfies GatePayload);
});

app.get("/api/prices", requirePay, (c) => {
  const response: PricesResponse = {
    ...config.prices,
    treasuryAddress: config.treasuryAddress,
  };
  return c.json(response);
});

// --- Auth ---
app.get("/api/auth/challenge", requirePay, async (c) => {
  const nonce = nanoid(24);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(schema.authNonces).values({ nonce, expiresAt, used: false });
  return c.json({
    nonce,
    message: `NimCharts:v1:${nonce}`,
    expiresAt: expiresAt.getTime(),
  });
});

app.post("/api/auth/verify", requirePay, async (c) => {
  try {
    const body = await c.req.json<{
      nonce: string;
      message: string;
      signerPublicKey: string;
      signature: string;
      signer?: string;
      demoWallet?: string;
      nimiqPayClient?: boolean;
    }>();

    if (!body?.nonce || !body?.message) {
      return c.json({ error: "invalid_body" }, 400);
    }

    const nonceRow = await db.query.authNonces.findFirst({
      where: eq(schema.authNonces.nonce, body.nonce),
    });
    if (!nonceRow || nonceRow.used || nonceRow.expiresAt < new Date()) {
      return c.json({ error: "invalid_or_expired_nonce" }, 400);
    }
    if (body.message !== `NimCharts:v1:${body.nonce}`) {
      return c.json({ error: "message_mismatch" }, 400);
    }

    let walletAddress: string;
    if (config.demoMode && body.demoWallet) {
      walletAddress = normalizeWallet(body.demoWallet);
    } else if (config.demoMode && body.signature?.startsWith("dev:")) {
      walletAddress = normalizeWallet(body.signature.slice(4));
    } else if (body.signerPublicKey && body.signature) {
      const { verifySignedMessageDeriveAddress, normalizeNqAddr } = await import(
        "./services/verifyNimiq.js"
      );
      const derived = await verifySignedMessageDeriveAddress(
        body.message,
        body.signerPublicKey,
        body.signature
      );
      if (derived) {
        if (body.signer && normalizeNqAddr(body.signer) !== normalizeNqAddr(derived)) {
          return c.json({ error: "signer_mismatch" }, 401);
        }
        walletAddress = normalizeWallet(derived);
      } else if (config.demoMode && body.signer) {
        // Local / Cycle-2: if crypto decode paths still differ from host encoding,
        // trust listAccounts() address when Pay already prompted the user to sign.
        console.warn("[auth/verify] crypto verify failed; accepting signer in DEMO_MODE");
        walletAddress = normalizeWallet(body.signer);
      } else {
        return c.json({ error: "invalid_signature" }, 401);
      }
    } else {
      return c.json({ error: "missing_signature" }, 400);
    }

    await db.update(schema.authNonces).set({ used: true }).where(eq(schema.authNonces.nonce, body.nonce));

    let user = await db.query.users.findFirst({
      where: eq(schema.users.walletAddress, walletAddress),
    });
    if (!user) {
      await db.insert(schema.users).values({
        walletAddress,
        handle: null,
        lifetimeUnlockedAt: null,
        createdAt: new Date(),
      });
      user = await db.query.users.findFirst({
        where: eq(schema.users.walletAddress, walletAddress),
      });
    }

    const token = nanoid(40);
    await db.insert(schema.sessions).values({
      token,
      walletAddress,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    return c.json({ token, user: await sessionUserFor(walletAddress) });
  } catch (err) {
    console.error("[auth/verify]", err);
    return c.json(
      { error: "auth_verify_failed", detail: String(err instanceof Error ? err.message : err) },
      500
    );
  }
});

app.get("/api/me", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const favoritesList = await listFavorites(user.walletAddress);
  const recommendsList = await listRecommends(user.walletAddress);
  const unlockRows = await db
    .select()
    .from(schema.unlocks)
    .innerJoin(schema.titles, eq(schema.unlocks.titleId, schema.titles.id))
    .where(eq(schema.unlocks.walletAddress, user.walletAddress))
    .orderBy(desc(schema.unlocks.createdAt));

  const response: MeResponse = {
    user: c.get("sessionUser"),
    favorites: favoritesList,
    recommends: recommendsList,
    unlocks: unlockRows.map((r) => toTitleSummary(r.titles)),
    shareUrl: user.handle ? `${config.webOrigin}/${user.handle}` : null,
    needsHandlePrompt: !user.handle,
  };
  return c.json(response);
});

app.post("/api/me/handle", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const { handle } = await c.req.json<{ handle: string }>();
  const cleaned = String(handle || "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(cleaned)) return c.json({ error: "invalid_handle" }, 400);

  const existing = await db.query.users.findFirst({
    where: and(eq(schema.users.handle, cleaned), sql`${schema.users.walletAddress} != ${user.walletAddress}`),
  });
  if (existing) return c.json({ error: "handle_taken" }, 409);

  await db.update(schema.users).set({ handle: cleaned }).where(eq(schema.users.walletAddress, user.walletAddress));
  const sessionUser = await sessionUserFor(user.walletAddress);
  return c.json({ user: sessionUser, shareUrl: `${config.webOrigin}/${cleaned}` });
});

// --- Catalog ---
app.get("/api/search", requirePay, requireAuth, async (c) => {
  const q = c.req.query("q") || "";
  try {
    const results = await searchCatalog(q);
    return c.json({ results });
  } catch {
    const rows = await db
      .select()
      .from(schema.titles)
      .where(sql`${schema.titles.title} LIKE ${`%${q}%`}`)
      .limit(24);
    return c.json({ results: rows.map(toTitleSummary) });
  }
});

app.get("/api/titles/popular", requirePay, requireAuth, async (c) => {
  const rows = await db
    .select()
    .from(schema.titles)
    .orderBy(sql`CAST(COALESCE(imdb_rating, tmdb_rating, '0') AS REAL) DESC`)
    .limit(40);
  return c.json({ results: rows.map(toTitleSummary) });
});

app.get("/api/titles/:id", requirePay, requireAuth, async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const user = c.get("user");
  let title = await db.query.titles.findFirst({ where: eq(schema.titles.id, id) });
  if (!title) {
    try {
      const fresh = await ensureTitleFresh(id);
      if (fresh) title = fresh;
    } catch {
      /* ignore */
    }
  }
  if (!title) return c.json({ error: "not_found" }, 404);

  const unlocked =
    !!user.lifetimeUnlockedAt ||
    !!(await db.query.unlocks.findFirst({
      where: and(eq(schema.unlocks.walletAddress, user.walletAddress), eq(schema.unlocks.titleId, id)),
    }));
  const favorited = await isFavorited(user.walletAddress, id);
  const recommended = favorited ? await isRecommended(user.walletAddress, id) : false;

  let episodeCells: EpisodeCell[] = [];
  if (unlocked) {
    const eps = await getEpisodesForTitle(id).catch(() =>
      db.select().from(schema.episodes).where(eq(schema.episodes.titleId, id))
    );
    episodeCells = eps.map((e) => ({
      season: e.season,
      episode: e.episode,
      name: e.name,
      imdbRating: e.imdbRating != null ? Number(e.imdbRating) : null,
    }));
  } else if (title.mediaType === "tv") {
    // Locked placeholder cells so the heat-map UI can blur
    const eps = await db.select().from(schema.episodes).where(eq(schema.episodes.titleId, id)).limit(40);
    episodeCells = eps.map((e) => ({
      season: e.season,
      episode: e.episode,
      name: e.name,
      imdbRating: null,
    }));
  }

  const commentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.comments)
    .where(eq(schema.comments.titleId, id))
    .then((r) => Number(r[0]?.count || 0));

  const summary = toTitleSummary(title);
  const detail: TitleDetail = {
    ...summary,
    unlocked,
    favorited,
    recommended,
    episodes: episodeCells,
    commentCount,
    imdbRating: unlocked ? summary.imdbRating : null,
    tmdbRating: unlocked ? summary.tmdbRating : null,
  };
  return c.json(detail);
});

app.get("/api/titles/:id/comments", requirePay, requireAuth, async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const rows = await db
    .select({
      id: schema.comments.id,
      walletAddress: schema.comments.walletAddress,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      handle: schema.users.handle,
    })
    .from(schema.comments)
    .leftJoin(schema.users, eq(schema.comments.walletAddress, schema.users.walletAddress))
    .where(eq(schema.comments.titleId, id))
    .orderBy(desc(schema.comments.createdAt));

  const comments: CommentDto[] = rows.map((r) => ({
    id: r.id,
    walletAddress: r.walletAddress,
    handle: r.handle,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }));
  return c.json({ comments });
});

// --- Favorites / Discover (social taste module) ---
app.get("/api/discover", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  return c.json(await discoverFor(user.walletAddress));
});

app.post("/api/favorites/:titleId", requirePay, requireAuth, async (c) => {
  const titleId = decodeURIComponent(c.req.param("titleId"));
  const user = c.get("user");
  await addFavorite(user.walletAddress, titleId);
  return c.json({ ok: true, user: await sessionUserFor(user.walletAddress) });
});

app.delete("/api/favorites/:titleId", requirePay, requireAuth, async (c) => {
  const titleId = decodeURIComponent(c.req.param("titleId"));
  const user = c.get("user");
  await removeFavorite(user.walletAddress, titleId);
  return c.json({ ok: true, user: await sessionUserFor(user.walletAddress) });
});

app.post("/api/recommends/:titleId", requirePay, requireAuth, async (c) => {
  const titleId = decodeURIComponent(c.req.param("titleId"));
  const user = c.get("user");
  try {
    await setRecommend(user.walletAddress, titleId);
  } catch (e) {
    if (e instanceof SocialTasteError) {
      const status = e.code === "recommend_cap" ? 409 : 400;
      return c.json({ error: e.code, message: e.message }, status);
    }
    throw e;
  }
  return c.json({ ok: true, user: await sessionUserFor(user.walletAddress) });
});

app.delete("/api/recommends/:titleId", requirePay, requireAuth, async (c) => {
  const titleId = decodeURIComponent(c.req.param("titleId"));
  const user = c.get("user");
  try {
    await clearRecommend(user.walletAddress, titleId);
  } catch (e) {
    if (e instanceof SocialTasteError) {
      return c.json({ error: e.code, message: e.message }, 400);
    }
    throw e;
  }
  return c.json({ ok: true, user: await sessionUserFor(user.walletAddress) });
});

// --- Payments ---
app.post("/api/unlocks", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const { titleId, txHash } = await c.req.json<{ titleId: string; txHash: string }>();
  if (!titleId || !txHash) return c.json({ error: "missing_fields" }, 400);
  try {
    await assertPayment({
      txHash,
      expectedMemoType: "unlock",
      expectedTitleId: titleId,
      expectedTo: config.treasuryAddress,
      minLuna: UNLOCK_LUNA,
      payerWallet: user.walletAddress,
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "payment_verify_failed" }, 400);
  }

  await db
    .insert(schema.unlocks)
    .values({
      walletAddress: user.walletAddress,
      titleId,
      txHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();
  return c.json({ ok: true, expectedLuna: UNLOCK_LUNA });
});

app.post("/api/lifetime", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const { txHash } = await c.req.json<{ txHash: string }>();
  if (!txHash) return c.json({ error: "missing_tx" }, 400);
  try {
    await assertPayment({
      txHash,
      expectedMemoType: "lifetime",
      expectedTo: config.treasuryAddress,
      minLuna: LIFETIME_UNLOCK_LUNA,
      payerWallet: user.walletAddress,
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "payment_verify_failed" }, 400);
  }
  await db
    .update(schema.users)
    .set({ lifetimeUnlockedAt: new Date() })
    .where(eq(schema.users.walletAddress, user.walletAddress));
  return c.json({ ok: true, user: await sessionUserFor(user.walletAddress), expectedLuna: LIFETIME_UNLOCK_LUNA });
});

app.post("/api/comments", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ titleId: string; body: string; txHash: string }>();
  const text = String(body.body || "").trim().slice(0, 500);
  if (!text || !body.titleId || !body.txHash) return c.json({ error: "missing_fields" }, 400);
  try {
    await assertPayment({
      txHash: body.txHash,
      expectedMemoType: "comment",
      expectedTitleId: body.titleId,
      expectedTo: config.treasuryAddress,
      minLuna: COMMENT_LUNA,
      payerWallet: user.walletAddress,
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "payment_verify_failed" }, 400);
  }

  await db.insert(schema.comments).values({
    titleId: body.titleId,
    walletAddress: user.walletAddress,
    body: text,
    txHash: body.txHash,
    createdAt: new Date(),
  });

  const rows = await db
    .select({
      id: schema.comments.id,
      walletAddress: schema.comments.walletAddress,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      handle: schema.users.handle,
    })
    .from(schema.comments)
    .leftJoin(schema.users, eq(schema.comments.walletAddress, schema.users.walletAddress))
    .where(eq(schema.comments.titleId, body.titleId))
    .orderBy(desc(schema.comments.createdAt));

  return c.json({
    comments: rows.map((r) => ({
      id: r.id,
      walletAddress: r.walletAddress,
      handle: r.handle,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    })),
    expectedLuna: COMMENT_LUNA,
  });
});

app.post("/api/thanks", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ toWallet: string; titleId: string; tipTxHash?: string }>();
  if (!body.toWallet || !body.titleId) return c.json({ error: "missing_fields" }, 400);
  const toWallet = normalizeWallet(body.toWallet);
  if (body.tipTxHash) {
    try {
      await assertPayment({
        txHash: body.tipTxHash,
        expectedMemoType: "thanks",
        expectedTo: toWallet,
        expectedTitleId: body.titleId,
        minLuna: 1,
        payerWallet: user.walletAddress,
      });
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "tip_verify_failed" }, 400);
    }
  }
  await db.insert(schema.thanks).values({
    fromWallet: user.walletAddress,
    toWallet,
    titleId: body.titleId,
    tipTxHash: body.tipTxHash || null,
    createdAt: new Date(),
  });
  return c.json({ ok: true });
});

app.get("/api/users/:wallet", requirePay, requireAuth, async (c) => {
  const walletAddress = normalizeWallet(c.req.param("wallet"));
  const me = c.get("user").walletAddress;
  const user = await db.query.users.findFirst({ where: eq(schema.users.walletAddress, walletAddress) });
  if (!user) return c.json({ error: "not_found" }, 404);
  const counts = await followCounts(walletAddress);
  const response: PublicProfile = {
    handle: user.handle || walletAddress.slice(0, 8).toLowerCase(),
    walletAddress: user.walletAddress,
    favorites: await listFavorites(walletAddress),
    recommends: await listRecommends(walletAddress),
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
    isFollowing: me === walletAddress ? false : await isFollowing(me, walletAddress),
    isSelf: me === walletAddress,
    heatmap: await activityHeatmap(walletAddress),
  };
  return c.json(response);
});

app.post("/api/users/:wallet/follow", requirePay, requireAuth, async (c) => {
  try {
    await followUser(c.get("user").walletAddress, c.req.param("wallet"));
    return c.json({ ok: true, following: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "follow_failed" }, 400);
  }
});

app.delete("/api/users/:wallet/follow", requirePay, requireAuth, async (c) => {
  await unfollowUser(c.get("user").walletAddress, c.req.param("wallet"));
  return c.json({ ok: true, following: false });
});

app.get("/api/feed", requirePay, requireAuth, async (c) => {
  const items = await followingFeed(c.get("user").walletAddress);
  const body: FollowingFeedResponse = { items };
  return c.json(body);
});

app.get("/api/users/:wallet/heatmap", requirePay, requireAuth, async (c) => {
  const walletAddress = normalizeWallet(c.req.param("wallet"));
  return c.json({ heatmap: await activityHeatmap(walletAddress) });
});

app.get("/api/titles/:id/suggesters", requirePay, requireAuth, async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const me = c.get("user").walletAddress;
  const peers = await db
    .select({
      walletAddress: schema.favorites.walletAddress,
      handle: schema.users.handle,
    })
    .from(schema.favorites)
    .leftJoin(schema.users, eq(schema.favorites.walletAddress, schema.users.walletAddress))
    .where(and(eq(schema.favorites.titleId, id), sql`${schema.favorites.walletAddress} != ${me}`))
    .limit(12);
  return c.json({
    suggesters: peers.map((p) => ({
      walletAddress: p.walletAddress,
      handle: p.handle,
    })),
  });
});

app.get("/api/activity", requirePay, requireAuth, async (c) => {
  const comments = await db
    .select({
      id: schema.comments.id,
      titleId: schema.comments.titleId,
      walletAddress: schema.comments.walletAddress,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      handle: schema.users.handle,
      titleName: schema.titles.title,
    })
    .from(schema.comments)
    .innerJoin(schema.titles, eq(schema.comments.titleId, schema.titles.id))
    .leftJoin(schema.users, eq(schema.comments.walletAddress, schema.users.walletAddress))
    .orderBy(desc(schema.comments.createdAt))
    .limit(30);

  const thanks = await db
    .select({
      id: schema.thanks.id,
      titleId: schema.thanks.titleId,
      fromWallet: schema.thanks.fromWallet,
      toWallet: schema.thanks.toWallet,
      tipTxHash: schema.thanks.tipTxHash,
      createdAt: schema.thanks.createdAt,
      fromHandle: schema.users.handle,
      titleName: schema.titles.title,
    })
    .from(schema.thanks)
    .innerJoin(schema.titles, eq(schema.thanks.titleId, schema.titles.id))
    .leftJoin(schema.users, eq(schema.thanks.fromWallet, schema.users.walletAddress))
    .orderBy(desc(schema.thanks.createdAt))
    .limit(30);

  const unlocks = await db
    .select({
      id: schema.unlocks.id,
      titleId: schema.unlocks.titleId,
      walletAddress: schema.unlocks.walletAddress,
      createdAt: schema.unlocks.createdAt,
      handle: schema.users.handle,
      titleName: schema.titles.title,
    })
    .from(schema.unlocks)
    .innerJoin(schema.titles, eq(schema.unlocks.titleId, schema.titles.id))
    .leftJoin(schema.users, eq(schema.unlocks.walletAddress, schema.users.walletAddress))
    .orderBy(desc(schema.unlocks.createdAt))
    .limit(30);

  const items: ActivityItem[] = [
    ...comments.map((r) => ({
      type: "comment" as const,
      id: r.id,
      titleId: r.titleId,
      titleName: r.titleName,
      walletAddress: r.walletAddress,
      handle: r.handle,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    })),
    ...thanks.map((r) => ({
      type: "thanks" as const,
      id: r.id,
      titleId: r.titleId,
      titleName: r.titleName,
      fromWallet: r.fromWallet,
      fromHandle: r.fromHandle,
      toWallet: r.toWallet,
      createdAt: r.createdAt.toISOString(),
      tipped: !!r.tipTxHash,
    })),
    ...unlocks.map((r) => ({
      type: "unlock" as const,
      id: r.id,
      titleId: r.titleId,
      titleName: r.titleName,
      walletAddress: r.walletAddress,
      handle: r.handle,
      createdAt: r.createdAt.toISOString(),
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return c.json({ items: items.slice(0, 40) });
});

// Public profile — no pay gate
app.get("/api/public/:username", async (c) => {
  const username = c.req.param("username").replace(/^@/, "").toLowerCase();
  let user = await db.query.users.findFirst({ where: eq(schema.users.handle, username) });
  if (!user) {
    const wallet = await lookupWalletByHandle(username).catch(() => null);
    if (wallet) {
      user = await db.query.users.findFirst({ where: eq(schema.users.walletAddress, wallet) });
      if (user && !user.handle) {
        await db.update(schema.users).set({ handle: username }).where(eq(schema.users.walletAddress, wallet));
        user = { ...user, handle: username };
      }
    }
  }
  if (!user?.handle) return c.json({ error: "not_found" }, 404);
  const counts = await followCounts(user.walletAddress);
  const response: PublicProfile = {
    handle: user.handle,
    walletAddress: user.walletAddress,
    favorites: await listFavorites(user.walletAddress),
    recommends: await listRecommends(user.walletAddress),
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
    isFollowing: false,
    isSelf: false,
    heatmap: await activityHeatmap(user.walletAddress),
  };
  return c.json(response);
});

export { app };