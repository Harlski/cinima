import { demoEnabledOutsidePay } from "./nimiqPay";

/** Hold the welcome card long enough to read, then fade. */
export const WELCOME_HOLD_MS = 1_600;
export const WELCOME_FADE_MS = 450;

/** Discover query to force Favorites onboarding (local / demo only). */
export const FORCE_FAVORITES_PICK_QUERY = "pickFavorites";

export function welcomeMessage(opts: {
  returning: boolean;
}): "Welcome Back!" | "Welcome!" {
  return opts.returning ? "Welcome Back!" : "Welcome!";
}

/**
 * Local / demo: tap the welcome identicon to jump into Favorites onboarding.
 * Never enabled inside Nimiq Pay production path.
 */
export function canForceFavoritesPick(): boolean {
  return import.meta.env.DEV || demoEnabledOutsidePay();
}

/** Returning = restored session, or wallet already has app history. */
export function isReturningUser(opts: {
  hadToken: boolean;
  handle: string | null | undefined;
  favoriteCount: number | null | undefined;
}): boolean {
  if (opts.hadToken) return true;
  if (opts.handle) return true;
  if ((opts.favoriteCount ?? 0) > 0) return true;
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
