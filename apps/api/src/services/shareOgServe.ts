import { eq } from "drizzle-orm";
import { makeTitleId, type MediaType } from "@cinima/shared";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { ogPosterUrl } from "../lib/titles.js";
import {
  prewarmShareOgImage,
  resolveShareOgImage,
  shareOgCacheKey,
} from "../lib/shareOgCache.js";
import {
  renderProfileShareOgImage,
  renderTitleShareOgImage,
} from "../lib/shareOgImage.js";
import { resolveProfileShareOgPoster } from "./shareLinks.js";
import { listFavorites, listRecommends } from "./favorites.js";

async function findPublicUserByHandle(username: string) {
  const handle = username.replace(/^@/, "").toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  return user?.handle ? user : null;
}

function titleShareOgKey(handle: string, mediaType: MediaType, tmdbId: number): string {
  return shareOgCacheKey("title", handle, mediaType, tmdbId);
}

function profileShareOgKey(handle: string): string {
  return shareOgCacheKey("profile", handle);
}

async function buildTitleShareOgImage(
  handle: string,
  mediaType: MediaType,
  tmdbId: number
): Promise<Buffer | null> {
  const user = await findPublicUserByHandle(handle);
  if (!user?.handle) return null;

  const id = makeTitleId(mediaType, tmdbId);
  const title = await db.query.titles.findFirst({ where: eq(schema.titles.id, id) });
  if (!title) return null;

  return renderTitleShareOgImage({
    handle: user.handle,
    titleName: title.title,
    posterUrl: ogPosterUrl(title.posterPath),
  });
}

async function buildProfileShareOgImage(handle: string): Promise<Buffer | null> {
  const user = await findPublicUserByHandle(handle);
  if (!user?.handle) return null;

  const recommends = await listRecommends(user.walletAddress);
  const favorites = await listFavorites(user.walletAddress);
  const posterUrl = await resolveProfileShareOgPoster(recommends, favorites);

  return renderProfileShareOgImage({ handle: user.handle, posterUrl });
}

/** Branded 1200x630 PNG for title share links (X/Facebook/LinkedIn large card). */
export function getTitleShareOgImage(
  handle: string,
  mediaType: MediaType,
  tmdbId: number
): Promise<Buffer | null> {
  const key = titleShareOgKey(handle, mediaType, tmdbId);
  return resolveShareOgImage(key, () => buildTitleShareOgImage(handle, mediaType, tmdbId));
}

/** Branded 1200x630 PNG for profile share links. */
export function getProfileShareOgImage(handle: string): Promise<Buffer | null> {
  const key = profileShareOgKey(handle);
  return resolveShareOgImage(key, () => buildProfileShareOgImage(handle));
}

export function prewarmTitleShareOgImage(
  handle: string,
  mediaType: MediaType,
  tmdbId: number
): void {
  const key = titleShareOgKey(handle, mediaType, tmdbId);
  prewarmShareOgImage(key, () => buildTitleShareOgImage(handle, mediaType, tmdbId));
}

export function prewarmProfileShareOgImage(handle: string): void {
  const key = profileShareOgKey(handle);
  prewarmShareOgImage(key, () => buildProfileShareOgImage(handle));
}
