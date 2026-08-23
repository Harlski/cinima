import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { makeTitleId, type MediaType, type ResolvedShareLink } from "@cinima/shared";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { toTitleSummary, ogPosterUrl } from "../lib/titles.js";
import { ensureTitleFresh } from "./catalog.js";
import { activityHeatmap, followCounts } from "./follow.js";
import { listFavorites, listRecommends } from "./favorites.js";

const genCode = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

async function allocateCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = genCode();
    const existing = await db.query.shareLinks.findFirst({
      where: eq(schema.shareLinks.code, code),
    });
    if (!existing) return code;
  }
  throw new Error("share_code_exhausted");
}

export async function getOrCreateTitleShareLink(
  walletAddress: string,
  handle: string,
  mediaType: MediaType,
  tmdbId: number
): Promise<string> {
  const existing = await db.query.shareLinks.findFirst({
    where: and(
      eq(schema.shareLinks.kind, "title"),
      eq(schema.shareLinks.handle, handle),
      eq(schema.shareLinks.mediaType, mediaType),
      eq(schema.shareLinks.tmdbId, tmdbId)
    ),
  });
  if (existing) return existing.code;

  const code = await allocateCode();
  await db.insert(schema.shareLinks).values({
    code,
    kind: "title",
    handle,
    mediaType,
    tmdbId,
    walletAddress,
    createdAt: new Date(),
  });
  return code;
}

export async function getOrCreateProfileShareLink(
  walletAddress: string,
  handle: string
): Promise<string> {
  const existing = await db.query.shareLinks.findFirst({
    where: and(eq(schema.shareLinks.kind, "profile"), eq(schema.shareLinks.handle, handle)),
  });
  if (existing) return existing.code;

  const code = await allocateCode();
  await db.insert(schema.shareLinks).values({
    code,
    kind: "profile",
    handle,
    mediaType: null,
    tmdbId: null,
    walletAddress,
    createdAt: new Date(),
  });
  return code;
}

export async function resolveShareLink(code: string): Promise<ResolvedShareLink | null> {
  const row = await db.query.shareLinks.findFirst({
    where: eq(schema.shareLinks.code, code.trim().toLowerCase()),
  });
  if (!row) return null;

  if (row.kind === "title") {
    if (!row.mediaType || row.tmdbId == null) return null;
    const mediaType = row.mediaType as MediaType;
    if (mediaType !== "movie" && mediaType !== "tv") return null;

    const id = makeTitleId(mediaType, row.tmdbId);
    let title = await db.query.titles.findFirst({ where: eq(schema.titles.id, id) });
    try {
      const fresh = await ensureTitleFresh(id);
      if (fresh) title = fresh;
    } catch {
      /* keep cached row if refresh fails */
    }
    if (!title) return null;

    return {
      kind: "title",
      code: row.code,
      handle: row.handle,
      walletAddress: row.walletAddress,
      title: toTitleSummary(title),
    };
  }

  if (row.kind === "profile") {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.handle, row.handle),
    });
    if (!user?.handle) return null;
    const counts = await followCounts(user.walletAddress);
    return {
      kind: "profile",
      code: row.code,
      handle: user.handle,
      walletAddress: user.walletAddress,
      favorites: await listFavorites(user.walletAddress),
      recommends: await listRecommends(user.walletAddress),
      followerCount: counts.followerCount,
      followingCount: counts.followingCount,
      isFollowing: false,
      isSelf: false,
      heatmap: await activityHeatmap(user.walletAddress),
      xHandle: user.xHandle ?? null,
    };
  }

  return null;
}

export function resolveShareLinkOgPoster(
  resolved: ResolvedShareLink
): string | null {
  if (resolved.kind === "title") {
    const posterPath = resolved.title.posterUrl;
    if (!posterPath) return null;
    if (posterPath.includes("image.tmdb.org")) {
      return posterPath.replace("/t/p/w342", "/t/p/w780");
    }
    return posterPath;
  }

  const previewPoster =
    resolved.recommends.find((t) => t.posterUrl)?.posterUrl ??
    resolved.favorites.find((t) => t.posterUrl)?.posterUrl ??
    null;
  return previewPoster;
}

export async function resolveShareLinkOgPosterFromDb(
  resolved: ResolvedShareLink
): Promise<string | null> {
  if (resolved.kind === "title") {
    const id = makeTitleId(resolved.title.mediaType, resolved.title.tmdbId);
    const title = await db.query.titles.findFirst({ where: eq(schema.titles.id, id) });
    return ogPosterUrl(title?.posterPath);
  }
  return resolveShareLinkOgPoster(resolved);
}
