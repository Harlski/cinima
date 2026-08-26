/** Session key for where to go after Enter Cinima (deep link → Landing → auth). */
const POST_AUTH_PATH_KEY = "cinima.postAuthPath";

const SAFE_POST_AUTH =
  /^\/(title|user|discover|my-list|search|me|activity)(\/|\?|$)/;

export function isSafePostAuthPath(path: string): boolean {
  return SAFE_POST_AUTH.test(path);
}

/** Remember an in-app path to open after wallet sign-in on Landing. */
export function stashPostAuthPath(path: string): void {
  try {
    if (!isSafePostAuthPath(path)) return;
    sessionStorage.setItem(POST_AUTH_PATH_KEY, path);
  } catch {
    // Ignore quota / private mode
  }
}

/** Read and clear a stashed post-auth path, or null if none / unsafe. */
export function takePostAuthPath(): string | null {
  try {
    const path = sessionStorage.getItem(POST_AUTH_PATH_KEY);
    sessionStorage.removeItem(POST_AUTH_PATH_KEY);
    if (!path || !isSafePostAuthPath(path)) return null;
    return path;
  } catch {
    return null;
  }
}
