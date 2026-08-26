import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  makeTitleId,
  normalizeWallet,
  openInPayUrl,
  type ActivityItem,
  type EpisodeCell,
  type GatePayload,
  type MeResponse,
  type PublicProfile,
  type SessionUser,
  type TitleShare,
  type TitleSuggester,
  type TitleDetail,
  type FollowingFeedResponse,
  type FollowingPeopleResponse,
  type FindPeopleResponse,
  type WatchlistResponse,
  type ShareLinkCreated,
  profileShareOgImageUrl,
  shortShareUrl,
  titleShareOgImageUrl,
  titleShareUrl,
} from "@cinima/shared";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
import { config } from "./lib/config.js";
import { bearerToken, isPayContext } from "./lib/util.js";
import { toTitleSummary, ogPosterUrl } from "./lib/titles.js";
import { assertValidUserHandle, normalizeUserHandle } from "./services/auth.js";
import { titleShareOgHtml } from "./lib/titleShareHtml.js";
import { profileShareOgHtml } from "./lib/profileShareHtml.js";
import {
  renderProfileShareOgImage,
  renderTitleShareOgImage,
  shareOgImageCacheControl,
} from "./lib/shareOgImage.js";
import {
  getOrCreateProfileShareLink,
  getOrCreateTitleShareLink,
  resolveShareLink,
  resolveShareLinkOgPosterFromDb,
  resolveShareLinkOgPoster,
  resolveProfileShareOgPoster,
} from "./services/shareLinks.js";
import {
  CommentError,
  createComment,
  deleteComment,
  listCommentsForTitle,
  commentActivityBody,
  updateComment,
} from "./services/comments.js";
import { searchCatalog, ensureTitleFresh, getEpisodesForTitle } from "./services/catalog.js";
import {
  activityHeatmap,
  followCounts,
  followUser,
  followingFeed,
  isFollowing,
  listFollowingPeople,
  listFindPeople,
  unfollowUser,
} from "./services/follow.js";
import {
  SocialTasteError,
  addFavorite,
  clearRecommend,
  discoverFor,
  skipDiscoverOnboarding,
  favoriteCount,
  isFavorited,
  isRecommended,
  listFavorites,
  listRecommends,
  listCommunityRecommends,
  removeFavorite,
  setRecommend,
} from "./services/favorites.js";
import {
  addToWatchlist,
  isOnWatchlist,
  listWatchlist,
  removeFromWatchlist,
} from "./services/watchlist.js";
import {
  addThanks,
  listSuggesters,
  thankAllSuggesters,
} from "./services/social.js";

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
    allowHeaders: ["Content-Type", "Authorization", "X-Cinima-Pay", "X-Cinima-Demo"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use("*", async (c, next) => {
  const demoQ = c.req.query("demo");
  c.set("payContext", isPayContext(c.req.raw.headers, demoQ) || config.demoMode);
  await next();
});

const PAYMENTS_RETIRED = {
  error: "payments_retired",
  message: "Catalog data is free. Cinima does not charge NIM for TMDB-sourced titles, ratings, or comments.",
} as const;

const requirePay = async (c: any, next: any) => {
  if (!c.get("payContext") && !config.demoMode) {
    const payload: GatePayload = {
      gate: true,
      message: "Cinima runs inside Nimiq Pay.",
      openInPayUrl: openInPayUrl(config.webOrigin),
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
    message: "Cinima runs inside Nimiq Pay.",
    openInPayUrl: openInPayUrl(config.webOrigin),
  } satisfies GatePayload);
});

app.get("/api/prices", requirePay, (c) => {
  return c.json(PAYMENTS_RETIRED, 410);
});

// --- Auth ---
app.get("/api/auth/challenge", requirePay, async (c) => {
  const nonce = nanoid(24);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(schema.authNonces).values({ nonce, expiresAt, used: false });
  return c.json({
    nonce,
    message: `Cinima:v1:${nonce}`,
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
    if (body.message !== `Cinima:v1:${body.nonce}`) {
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
  const watchlistList = await listWatchlist(user.walletAddress);
  const unlockRows = await db
    .select()
    .from(schema.unlocks)
    .innerJoin(schema.titles, eq(schema.unlocks.titleId, schema.titles.id))
    .where(eq(schema.unlocks.walletAddress, user.walletAddress))
    .orderBy(desc(schema.unlocks.createdAt));

  const profileShareCode = user.handle
    ? await getOrCreateProfileShareLink(user.walletAddress, user.handle)
    : null;

  const response: MeResponse = {
    user: c.get("sessionUser"),
    favorites: favoritesList,
    recommends: recommendsList,
    watchlist: watchlistList,
    unlocks: unlockRows.map((r) => toTitleSummary(r.titles)),
    shareUrl: profileShareCode ? shortShareUrl(config.webOrigin, profileShareCode) : null,
    needsHandlePrompt: !user.handle,
    xHandle: user.xHandle ?? null,
  };
  return c.json(response);
});

app.post("/api/me/handle", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const { handle } = await c.req.json<{ handle: string }>();
  const cleaned = normalizeUserHandle(handle);
  try {
    assertValidUserHandle(cleaned);
  } catch (err) {
    const code = err instanceof Error ? err.message : "invalid_handle";
    if (code === "invalid_handle" || code === "handle_profane") {
      return c.json({ error: code }, 400);
    }
    throw err;
  }

  const existing = await db.query.users.findFirst({
    where: and(eq(schema.users.handle, cleaned), sql`${schema.users.walletAddress} != ${user.walletAddress}`),
  });
  if (existing) return c.json({ error: "handle_taken" }, 409);

  await db.update(schema.users).set({ handle: cleaned }).where(eq(schema.users.walletAddress, user.walletAddress));
  const sessionUser = await sessionUserFor(user.walletAddress);
  const code = await getOrCreateProfileShareLink(user.walletAddress, cleaned);
  return c.json({ user: sessionUser, shareUrl: shortShareUrl(config.webOrigin, code) });
});

app.post("/api/me/x-handle", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const { xHandle } = await c.req.json<{ xHandle: string | null }>();
  const cleaned = String(xHandle ?? "")
    .replace(/^@/, "")
    .trim();
  if (!cleaned) {
    await db
      .update(schema.users)
      .set({ xHandle: null })
      .where(eq(schema.users.walletAddress, user.walletAddress));
    return c.json({ xHandle: null });
  }
  if (!/^[A-Za-z0-9_]{1,15}$/.test(cleaned)) return c.json({ error: "invalid_x_handle" }, 400);
  await db
    .update(schema.users)
    .set({ xHandle: cleaned })
    .where(eq(schema.users.walletAddress, user.walletAddress));
  return c.json({ xHandle: cleaned });
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
    .orderBy(sql`CAST(COALESCE(rating, '0') AS REAL) DESC`)
    .limit(40);
  return c.json({ results: rows.map(toTitleSummary) });
});

app.get("/api/titles/:id", requirePay, requireAuth, async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const user = c.get("user");
  let title = await db.query.titles.findFirst({ where: eq(schema.titles.id, id) });
  try {
    const fresh = await ensureTitleFresh(id);
    if (fresh) title = fresh;
  } catch {
    /* keep cached row if refresh fails */
  }
  if (!title) return c.json({ error: "not_found" }, 404);

  const favorited = await isFavorited(user.walletAddress, id);
  const recommended = favorited ? await isRecommended(user.walletAddress, id) : false;
  const watchlisted = await isOnWatchlist(user.walletAddress, id);

  const eps = await getEpisodesForTitle(id).catch(() =>
    db.select().from(schema.episodes).where(eq(schema.episodes.titleId, id))
  );
  const episodeCells: EpisodeCell[] = eps.map((e) => ({
    season: e.season,
    episode: e.episode,
    name: e.name,
    overview: e.overview ?? null,
    rating: e.rating != null ? Number(e.rating) : null,
    imdbId: e.imdbId ?? null,
  }));

  const commentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.comments)
    .where(eq(schema.comments.titleId, id))
    .then((r) => Number(r[0]?.count || 0));

  const summary = toTitleSummary(title);
  const detail: TitleDetail = {
    ...summary,
    unlocked: true,
    favorited,
    recommended,
    watchlisted,
    episodes: episodeCells,
    commentCount,
  };
  return c.json(detail);
});

app.get("/api/titles/:id/comments", requirePay, requireAuth, async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  return c.json({ comments: await listCommentsForTitle(id) });
});

// --- Favorites / Discover (social taste module) ---
app.get("/api/discover", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const forceOnboarding = c.req.query("forceOnboarding") === "1";
  return c.json(
    await discoverFor(user.walletAddress, {
      forceOnboarding: forceOnboarding && config.demoMode,
    })
  );
});

app.post("/api/discover/skip-onboarding", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  await skipDiscoverOnboarding(user.walletAddress);
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

app.get("/api/recommends/community", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  return c.json(await listCommunityRecommends(user.walletAddress));
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

app.get("/api/watchlist", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const items = await listWatchlist(user.walletAddress);
  const response: WatchlistResponse = { items };
  return c.json(response);
});

app.post("/api/watchlist/:titleId", requirePay, requireAuth, async (c) => {
  const titleId = decodeURIComponent(c.req.param("titleId"));
  const user = c.get("user");
  await addToWatchlist(user.walletAddress, titleId);
  return c.json({ ok: true });
});

app.delete("/api/watchlist/:titleId", requirePay, requireAuth, async (c) => {
  const titleId = decodeURIComponent(c.req.param("titleId"));
  const user = c.get("user");
  await removeFromWatchlist(user.walletAddress, titleId);
  return c.json({ ok: true });
});

// --- Payments (retired: TMDB catalog data is not sold) ---
app.post("/api/unlocks", requirePay, requireAuth, (c) => c.json(PAYMENTS_RETIRED, 410));

app.post("/api/lifetime", requirePay, requireAuth, (c) => c.json(PAYMENTS_RETIRED, 410));

app.post("/api/comments", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ titleId: string; body: string }>();
  if (!body.titleId) return c.json({ error: "missing_fields" }, 400);

  try {
    const comments = await createComment(user.walletAddress, body.titleId, body.body ?? "");
    return c.json({ comments });
  } catch (e) {
    if (e instanceof CommentError) {
      return c.json({ error: e.code, message: e.message }, 400);
    }
    throw e;
  }
});

function commentErrorStatus(code: CommentError["code"]): 400 | 403 | 404 {
  if (code === "not_found") return 404;
  if (code === "forbidden") return 403;
  return 400;
}

app.patch("/api/comments/:id", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: "invalid_id" }, 400);

  const body = await c.req.json<{ body: string }>();
  try {
    const comment = await updateComment(user.walletAddress, id, body.body ?? "");
    return c.json({ comment });
  } catch (e) {
    if (e instanceof CommentError) {
      return c.json({ error: e.code, message: e.message }, commentErrorStatus(e.code));
    }
    throw e;
  }
});

app.delete("/api/comments/:id", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: "invalid_id" }, 400);

  try {
    const comment = await deleteComment(user.walletAddress, id);
    return c.json({ comment });
  } catch (e) {
    if (e instanceof CommentError) {
      return c.json({ error: e.code, message: e.message }, commentErrorStatus(e.code));
    }
    throw e;
  }
});

app.post("/api/thanks", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ toWallet: string; titleId: string; tipTxHash?: string }>();
  if (!body.toWallet || !body.titleId) return c.json({ error: "missing_fields" }, 400);
  if (body.tipTxHash) return c.json(PAYMENTS_RETIRED, 410);
  try {
    const result = await addThanks({
      from: user.walletAddress,
      to: body.toWallet,
      titleId: body.titleId,
    });
    return c.json({ ok: true, created: result.created });
  } catch (err) {
    const code = err instanceof Error ? err.message : "thanks_failed";
    if (code === "cannot_thank_self") return c.json({ error: code }, 400);
    if (code === "payments_retired") return c.json(PAYMENTS_RETIRED, 410);
    return c.json({ error: code }, 400);
  }
});

app.post("/api/thanks/all", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ titleId: string }>();
  if (!body.titleId) return c.json({ error: "missing_fields" }, 400);
  const thanked = await thankAllSuggesters(user.walletAddress, body.titleId);
  return c.json({ ok: true, thanked });
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
    xHandle: user.xHandle ?? null,
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

app.get("/api/following", requirePay, requireAuth, async (c) => {
  const people = await listFollowingPeople(c.get("user").walletAddress);
  const body: FollowingPeopleResponse = { people };
  return c.json(body);
});

app.get("/api/find-people", requirePay, requireAuth, async (c) => {
  const people = await listFindPeople(c.get("user").walletAddress);
  const body: FindPeopleResponse = { people };
  return c.json(body);
});

app.get("/api/feed", requirePay, requireAuth, async (c) => {
  const followee = c.req.query("followee");
  try {
    const items = await followingFeed(
      c.get("user").walletAddress,
      40,
      followee || undefined
    );
    const body: FollowingFeedResponse = { items };
    return c.json(body);
  } catch (e) {
    const code = e instanceof Error ? e.message : "feed_failed";
    if (code === "not_following") return c.json({ error: code }, 403);
    return c.json({ error: code }, 400);
  }
});

app.get("/api/users/:wallet/heatmap", requirePay, requireAuth, async (c) => {
  const walletAddress = normalizeWallet(c.req.param("wallet"));
  return c.json({ heatmap: await activityHeatmap(walletAddress) });
});

app.get("/api/titles/:id/suggesters", requirePay, requireAuth, async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const suggesters: TitleSuggester[] = await listSuggesters(id, c.get("user").walletAddress);
  return c.json({ suggesters });
});

app.get("/api/activity", requirePay, requireAuth, async (c) => {
  const comments = await db
    .select({
      id: schema.comments.id,
      titleId: schema.comments.titleId,
      walletAddress: schema.comments.walletAddress,
      body: schema.comments.body,
      deletedAt: schema.comments.deletedAt,
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
      body: commentActivityBody(r),
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

async function findPublicUserByHandle(username: string) {
  const handle = username.replace(/^@/, "").toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  return user?.handle ? user : null;
}

function wantsHtml(accept: string | undefined): boolean {
  const a = accept || "";
  return a.includes("text/html") && !a.includes("application/json");
}

function pngResponse(body: Buffer): Response {
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": shareOgImageCacheControl(),
    },
  });
}

// Branded Share preview images — no pay gate
app.get("/api/og/profile/:handle.png", async (c) => {
  const handle = c.req.param("handle") ?? "";
  const user = await findPublicUserByHandle(handle);
  if (!user?.handle) return c.json({ error: "not_found" }, 404);

  const recommends = await listRecommends(user.walletAddress);
  const favorites = await listFavorites(user.walletAddress);
  const posterUrl = await resolveProfileShareOgPoster(recommends, favorites);
  const png = await renderProfileShareOgImage({ handle: user.handle, posterUrl });
  return pngResponse(png);
});

app.get("/api/og/title/:handle/:mediaType/:tmdbId.png", async (c) => {
  const mediaType = c.req.param("mediaType");
  const tmdbId = Number(c.req.param("tmdbId"));
  if ((mediaType !== "movie" && mediaType !== "tv") || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return c.json({ error: "not_found" }, 404);
  }

  const user = await findPublicUserByHandle(c.req.param("handle"));
  if (!user?.handle) return c.json({ error: "not_found" }, 404);

  const id = makeTitleId(mediaType, tmdbId);
  const title = await db.query.titles.findFirst({ where: eq(schema.titles.id, id) });
  if (!title) return c.json({ error: "not_found" }, 404);

  const png = await renderTitleShareOgImage({
    handle: user.handle,
    titleName: title.title,
    posterUrl: ogPosterUrl(title.posterPath),
  });
  return pngResponse(png);
});

// Title Share — no pay gate
app.get("/api/public/:handle/t/:mediaType/:tmdbId", async (c) => {
  const mediaType = c.req.param("mediaType");
  const tmdbId = Number(c.req.param("tmdbId"));
  if ((mediaType !== "movie" && mediaType !== "tv") || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return c.json({ error: "not_found" }, 404);
  }

  const user = await findPublicUserByHandle(c.req.param("handle"));
  if (!user?.handle) return c.json({ error: "not_found" }, 404);

  const id = makeTitleId(mediaType, tmdbId);
  let title = await db.query.titles.findFirst({ where: eq(schema.titles.id, id) });
  try {
    const fresh = await ensureTitleFresh(id);
    if (fresh) title = fresh;
  } catch {
    /* keep cached row if refresh fails */
  }
  if (!title) return c.json({ error: "not_found" }, 404);

  const summary = toTitleSummary(title);
  if (wantsHtml(c.req.header("accept"))) {
    const pageUrl = titleShareUrl(config.webOrigin, user.handle, mediaType, tmdbId);
    return c.html(
      titleShareOgHtml({
        pageUrl,
        handle: user.handle,
        titleName: summary.title,
        ogImageUrl: titleShareOgImageUrl(
          config.apiOrigin,
          user.handle,
          mediaType,
          tmdbId
        ),
      })
    );
  }

  const response: TitleShare = {
    handle: user.handle,
    walletAddress: user.walletAddress,
    title: summary,
  };
  return c.json(response);
});

// Public profile — no pay gate
app.get("/api/public/:username", async (c) => {
  const user = await findPublicUserByHandle(c.req.param("username"));
  if (!user?.handle) return c.json({ error: "not_found" }, 404);
  const favorites = await listFavorites(user.walletAddress);
  const recommends = await listRecommends(user.walletAddress);
  const counts = await followCounts(user.walletAddress);

  if (wantsHtml(c.req.header("accept"))) {
    const pageUrl = `${config.webOrigin}/${user.handle}`;
    return c.html(
      profileShareOgHtml({
        pageUrl,
        handle: user.handle,
        ogImageUrl: profileShareOgImageUrl(config.apiOrigin, user.handle),
      })
    );
  }

  const response: PublicProfile = {
    handle: user.handle,
    walletAddress: user.walletAddress,
    favorites,
    recommends,
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
    isFollowing: false,
    isSelf: false,
    heatmap: await activityHeatmap(user.walletAddress),
    xHandle: user.xHandle ?? null,
  };
  return c.json(response);
});

app.post("/api/share/title", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  if (!user.handle) return c.json({ error: "handle_required" }, 400);

  const body = await c.req.json<{ mediaType?: string; tmdbId?: number }>();
  const mediaType = body?.mediaType;
  const tmdbId = Number(body?.tmdbId);
  if ((mediaType !== "movie" && mediaType !== "tv") || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return c.json({ error: "invalid_body" }, 400);
  }

  const code = await getOrCreateTitleShareLink(
    user.walletAddress,
    user.handle,
    mediaType,
    tmdbId
  );
  const response: ShareLinkCreated = { code, kind: "title" };
  return c.json(response);
});

app.post("/api/share/profile", requirePay, requireAuth, async (c) => {
  const user = c.get("user");
  if (!user.handle) return c.json({ error: "handle_required" }, 400);

  const code = await getOrCreateProfileShareLink(user.walletAddress, user.handle);
  const response: ShareLinkCreated = { code, kind: "profile" };
  return c.json(response);
});

app.get("/api/s/:code", async (c) => {
  const resolved = await resolveShareLink(c.req.param("code"));
  if (!resolved) return c.json({ error: "not_found" }, 404);

  if (wantsHtml(c.req.header("accept"))) {
    const pageUrl = shortShareUrl(config.webOrigin, resolved.code);
    if (resolved.kind === "title") {
      return c.html(
        titleShareOgHtml({
          pageUrl,
          handle: resolved.handle,
          titleName: resolved.title.title,
          ogImageUrl: titleShareOgImageUrl(
            config.apiOrigin,
            resolved.handle,
            resolved.title.mediaType,
            resolved.title.tmdbId
          ),
        })
      );
    }

    return c.html(
      profileShareOgHtml({
        pageUrl,
        handle: resolved.handle,
        ogImageUrl: profileShareOgImageUrl(config.apiOrigin, resolved.handle),
      })
    );
  }

  return c.json(resolved);
});

export { app };