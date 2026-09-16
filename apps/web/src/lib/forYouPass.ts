export const PASS_SWIPE_DY = 56;
export const PASS_AXIS_SLOP = 10;

export type PassAxis = "x" | "y";

/** Lock Pass vs strip scroll once the pointer leaves the slop box. */
export function lockPassAxis(
  dx: number,
  dy: number,
  slop = PASS_AXIS_SLOP
): PassAxis | null {
  if (Math.abs(dx) < slop && Math.abs(dy) < slop) return null;
  return Math.abs(dy) > Math.abs(dx) ? "y" : "x";
}

export const FOR_YOU_ORIGIN_ATTR = "data-for-you-origin";
export const FOR_YOU_SLOT_ATTR = "data-for-you-slot";

export const PASS_FIZZLE_MS = 420;
export const PASS_COLLAPSE_MS = 360;
export const PASS_DRAG_RESIST = 720;
export const FOR_YOU_REFILL_MS = 240;
export const FOR_YOU_REFILL_STAGGER_MS = 90;
export const FOR_YOU_REFILL_LAND_MS = 280;

export function isPassSwipe(
  dx: number,
  dy: number,
  threshold = PASS_SWIPE_DY
): boolean {
  if (dy > -threshold) return false;
  return Math.abs(dy) >= Math.abs(dx) * 1.25;
}

export type PassFizzleOrigin = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PassFizzlePoint = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

function quadratic(t: number, p0: number, p1: number, p2: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

function zeroish(n: number): number {
  return n === 0 ? 0 : n;
}

/** Map an upward pull to fizzle progress with rubber-band resistance. */
export function passDragProgress(
  dy: number,
  resist = PASS_DRAG_RESIST
): number {
  const pull = Math.max(0, -dy);
  if (pull === 0 || resist <= 0) return 0;
  return pull / (pull + resist);
}

/** Straight up when no target is given; otherwise a toss that curves into the CINIMA header. */
export function passFizzleAt(
  progress: number,
  origin?: PassFizzleOrigin,
  target?: PassFizzleOrigin
): PassFizzlePoint {
  const p = Math.min(1, Math.max(0, progress));
  const scale = 0.3 + 0.7 * (1 - p);
  const opacity = 1 - p;
  if (!origin || !target) {
    return { x: 0, y: zeroish(-120 * p), scale, opacity };
  }
  const cardCx = origin.left + origin.width / 2;
  const cardCy = origin.top + origin.height / 2;
  const toCx = target.left + target.width / 2;
  const toCy = target.top + target.height / 2;
  const p2x = toCx - cardCx;
  const p2y = toCy - cardCy;
  const p1x = p2x * 0.18;
  const p1y = Math.min(p2y, 0) * 0.42 - origin.height * 0.45;
  return {
    x: zeroish(quadratic(p, 0, p1x, p2x)),
    y: zeroish(quadratic(p, 0, p1y, p2y)),
    scale,
    opacity,
  };
}

export function shouldPlayForYouMotion(opts: {
  tourActive: boolean;
  tourForYouPass?: boolean;
  onboarding: boolean;
  reduceMotion: boolean;
}): boolean {
  if (opts.onboarding || opts.reduceMotion) return false;
  if (opts.tourActive && !opts.tourForYouPass) return false;
  return true;
}

/** Instant recentering when motion is off; otherwise ease remaining cards into the hole. */
export function passStripSnapBehavior(reduceMotion: boolean): ScrollBehavior {
  return reduceMotion ? "auto" : "smooth";
}

/**
 * A later swipe may start collapsing a card whose Pass never landed.
 * Only hold the local strip while a title that actually left is collapsing.
 */
export function passCollapseDeckAction(input: {
  collapsingIds: readonly string[];
  nextIds: readonly string[];
}): "collapse-removed" | "apply" {
  if (input.collapsingIds.some((id) => !input.nextIds.includes(id))) {
    return "collapse-removed";
  }
  return "apply";
}

/** False while Pass is still in flight: applying the pool would resurrect the card. */
export function passCollapseCanApplyPool(input: {
  leavingIds: readonly string[];
  nextIds: readonly string[];
}): boolean {
  if (!input.leavingIds.length) return true;
  return input.leavingIds.every((id) => !input.nextIds.includes(id));
}

/** Keep the hole closed until the set drops the title, or the Pass request gives up. */
export const PASS_COLLAPSE_HOLD_MS = 8_000;

export function passCollapseShouldHold(input: {
  leavingIds: readonly string[];
  nextIds: readonly string[];
  elapsedMs: number;
  holdMs?: number;
}): boolean {
  if (passCollapseCanApplyPool(input)) return false;
  return input.elapsedMs < (input.holdMs ?? PASS_COLLAPSE_HOLD_MS);
}

export function addPassLeavingId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? [...ids] : [...ids, id];
}

export function removePassLeavingId(
  ids: readonly string[],
  id: string
): string[] {
  return ids.filter((item) => item !== id);
}

/**
 * Deal order for refill clones. For five slots the LTR turn-on ordinals are
 * 4 2 1 3 5: center first, then left, right, far left, far right.
 */
export function forYouRefillOrder(count: number): number[] {
  const n = Math.max(0, count);
  if (n === 0) return [];
  const center = Math.floor((n - 1) / 2);
  const order: number[] = [center];
  for (let reach = 1; order.length < n; reach++) {
    const left = center - reach;
    const right = center + reach;
    if (left >= 0) order.push(left);
    if (right < n) order.push(right);
  }
  return order;
}

export function forYouRefillDelay(
  slot: number,
  count = 5,
  staggerMs = FOR_YOU_REFILL_STAGGER_MS
): number {
  const wave = forYouRefillOrder(count).indexOf(slot);
  return Math.max(0, wave) * staggerMs;
}

/** Pass is locked for the whole set until every refill clone has landed. */
export function canPassForYouSlot(
  _index: number,
  pendingSlots: readonly number[]
): boolean {
  return pendingSlots.length === 0;
}

/** Reveal the live slot, then drop the clone once that paint has landed. */
export function scheduleForYouRefillHandoff(
  dropClone: () => void,
  raf: typeof requestAnimationFrame | undefined = globalThis.requestAnimationFrame
): void {
  if (typeof raf !== "function") {
    dropClone();
    return;
  }
  raf(() => {
    raf(dropClone);
  });
}
export function forYouRefillStart(
  from: PassFizzleOrigin,
  to: PassFizzleOrigin
): { dx: number; dy: number } {
  const fromCx = from.left + from.width / 2;
  const fromCy = from.top + from.height / 2;
  const toCx = to.left + to.width / 2;
  const toCy = to.top + to.height / 2;
  return {
    dx: fromCx - toCx,
    dy: fromCy - toCy,
  };
}

export type ForYouRefillLandScale = {
  x: number;
  y: number;
  offset: number;
};

/** Compress once on landing, then ease back to full height. */
export function forYouRefillLandKeyframes(): ForYouRefillLandScale[] {
  return [
    { x: 1, y: 1, offset: 0 },
    { x: 1.18, y: 0.72, offset: 0.34 },
    { x: 1, y: 1, offset: 1 },
  ];
}
