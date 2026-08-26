import { demoEnabledOutsidePay } from "./nimiqPay";

/** Hold the welcome card long enough to read, then fade. */
export const WELCOME_HOLD_MS = 1_600;
export const WELCOME_FADE_MS = 450;

/** Discover query to force full onboarding (local / demo only). */
export const FORCE_FAVORITES_PICK_QUERY = "pickFavorites";

/**
 * Survives Discover remounts when AppShell keys on route.fullPath and the
 * pickFavorites query is stripped mid-load.
 *
 * Phases: "handle" → username step first; "favorites" → force Discover
 * onboarding API / Favorites UI after handle Continue/Skip.
 */
const FORCE_ONBOARDING_SESSION_KEY = "cinima.forceOnboardingFlow";

type ForceOnboardingPhase = "handle" | "favorites";

function readForcePhase(): ForceOnboardingPhase | null {
  try {
    const v = sessionStorage.getItem(FORCE_ONBOARDING_SESSION_KEY);
    if (v === "handle" || v === "favorites") return v;
    return null;
  } catch {
    return null;
  }
}

function writeForcePhase(phase: ForceOnboardingPhase | null): void {
  try {
    if (!phase) sessionStorage.removeItem(FORCE_ONBOARDING_SESSION_KEY);
    else sessionStorage.setItem(FORCE_ONBOARDING_SESSION_KEY, phase);
  } catch {
    // Ignore quota / private mode
  }
}

/** Start (or restart) the full dev onboarding flow at the username step. */
export function armForceOnboardingFlow(): void {
  writeForcePhase("handle");
}

/** After handle Continue/Skip: force Favorites onboarding next. */
export function advanceForceOnboardingToFavorites(): void {
  if (readForcePhase()) writeForcePhase("favorites");
}

export function clearForceOnboardingFlow(): void {
  writeForcePhase(null);
}

export function isForceHandleArmed(): boolean {
  return readForcePhase() === "handle";
}

export function isForceFavoritesArmed(): boolean {
  return readForcePhase() === "favorites";
}

/** True while any force-onboarding phase is armed (prefetch with forceOnboarding). */
export function isForceOnboardingArmed(): boolean {
  return readForcePhase() !== null;
}

export function welcomeMessage(opts: {
  returning: boolean;
  handle?: string | null;
}): string {
  if (!opts.returning) return "Welcome!";
  const handle = opts.handle?.trim();
  if (handle) return `Welcome Back, ${handle}!`;
  return "Welcome Back!";
}

/**
 * Local / demo: tap the welcome identicon to jump into full onboarding
 * (username, then Favorites pick).
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
