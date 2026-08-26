/** Warm CDN poster URLs so Favorites onboarding cards appear without spinners. */
export function preloadImages(
  urls: Array<string | null | undefined>,
  opts?: { timeoutMs?: number }
): Promise<void> {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))];
  if (!unique.length) return Promise.resolve();

  const timeoutMs = opts?.timeoutMs ?? 4_000;

  const loadOne = (url: string) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });

  return Promise.race([
    Promise.all(unique.map(loadOne)).then(() => undefined),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}
