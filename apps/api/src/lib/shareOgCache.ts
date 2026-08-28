/** In-memory Share preview PNG cache (1200x630 social card). */

const cache = new Map<string, Buffer>();
const inflight = new Map<string, Promise<Buffer | null>>();

export function shareOgCacheKey(
  kind: "title" | "profile",
  ...parts: (string | number)[]
): string {
  return `${kind}:${parts.map(String).join(":")}`;
}

export function getCachedShareOgImage(key: string): Buffer | undefined {
  return cache.get(key);
}

export function setCachedShareOgImage(key: string, png: Buffer): void {
  cache.set(key, png);
}

/** Clear cache between tests. */
export function resetShareOgImageCache(): void {
  cache.clear();
  inflight.clear();
}

/**
 * Return a cached PNG, or run `build` once and share the result across callers.
 * Failed builds are not cached so crawlers can retry.
 */
export async function resolveShareOgImage(
  key: string,
  build: () => Promise<Buffer | null>
): Promise<Buffer | null> {
  const cached = cache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = build()
    .then((png) => {
      inflight.delete(key);
      if (png && png.length > 0) cache.set(key, png);
      return png;
    })
    .catch((err) => {
      inflight.delete(key);
      console.error("[shareOg]", key, err);
      return null;
    });

  inflight.set(key, promise);
  return promise;
}

/** Fire-and-forget warm-up when the PNG is not already cached. */
export function prewarmShareOgImage(key: string, build: () => Promise<Buffer | null>): void {
  if (cache.has(key) || inflight.has(key)) return;
  void resolveShareOgImage(key, build);
}
