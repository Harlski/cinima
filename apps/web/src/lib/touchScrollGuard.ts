export type ScrollMetrics = {
  overflowY: string;
  overflowX?: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  /** Overlay chrome: ancestors past this node are not page scroll. */
  isScrollTrap?: boolean;
};

export const SCROLL_TRAP_ATTR = "data-scroll-trap";

const SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);

function isHorizontalOnlyScroller(metrics: ScrollMetrics): boolean {
  return (
    SCROLLABLE_OVERFLOW.has(metrics.overflowX ?? "visible") &&
    !SCROLLABLE_OVERFLOW.has(metrics.overflowY)
  );
}

/**
 * Positive contentDeltaY = finger moved up (content wants to scroll down).
 * Negative = finger moved down (content wants to scroll up / pull-to-refresh).
 */
export function canAbsorbVerticalScroll(
  metrics: ScrollMetrics,
  contentDeltaY: number
): boolean {
  if (contentDeltaY === 0) return false;
  return unabsorbedVerticalDelta(metrics, contentDeltaY) !== contentDeltaY;
}

/**
 * Portion of contentDeltaY this scroller cannot take. 0 means it can absorb
 * the whole move; a non-zero leftover should continue to an ancestor.
 */
export function unabsorbedVerticalDelta(
  metrics: ScrollMetrics,
  contentDeltaY: number
): number {
  if (contentDeltaY === 0) return 0;
  if (!SCROLLABLE_OVERFLOW.has(metrics.overflowY)) return contentDeltaY;
  if (metrics.scrollHeight <= metrics.clientHeight + 1) return contentDeltaY;

  if (contentDeltaY < 0) {
    const room = metrics.scrollTop;
    if (room <= 0) return contentDeltaY;
    return Math.min(0, contentDeltaY + room);
  }

  const room =
    metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop;
  if (room <= 1) return contentDeltaY;
  if (contentDeltaY <= room) return 0;
  return contentDeltaY - room;
}

export type NestedScrollHandoff = {
  nestedIndex: number;
  nestedDelta: number;
  ancestorIndex: number;
  ancestorDelta: number;
};

/**
 * When a nested scroller (episode ratings, season tabs) is at the end of
 * its range, pass leftover travel to the next ancestor that can still move.
 */
export function nestedScrollHandoff(
  chain: ScrollMetrics[],
  contentDeltaY: number
): NestedScrollHandoff | null {
  if (contentDeltaY === 0) return null;

  let nestedIndex = -1;
  for (let i = 0; i < chain.length; i++) {
    if (SCROLLABLE_OVERFLOW.has(chain[i].overflowY)) {
      nestedIndex = i;
      break;
    }
  }
  if (nestedIndex < 0) return null;

  const leftover = unabsorbedVerticalDelta(chain[nestedIndex], contentDeltaY);
  if (leftover === 0) return null;

  for (let i = nestedIndex + 1; i < chain.length; i++) {
    if (!canAbsorbVerticalScroll(chain[i], leftover)) continue;
    const ancestorLeftover = unabsorbedVerticalDelta(chain[i], leftover);
    const ancestorDelta = leftover - ancestorLeftover;
    if (ancestorDelta === 0) continue;
    return {
      nestedIndex,
      nestedDelta: contentDeltaY - leftover,
      ancestorIndex: i,
      ancestorDelta,
    };
  }
  return null;
}

/** Ancestors past overlay chrome are the page; they must not take the gesture. */
function chainInsideScrollTrap(chain: ScrollMetrics[]): ScrollMetrics[] {
  const trapAt = chain.findIndex((metrics) => metrics.isScrollTrap);
  if (trapAt < 0) return chain;
  return chain.slice(0, trapAt + 1);
}

/**
 * True when a vertical drag has no scroll container that can move further —
 * the case that rubber-bands Nimiq Pay / mobile WebViews and slides content
 * under fixed chrome. Overlay traps cut the page scroller out of the chain.
 */
export function shouldBlockRubberBandScroll(
  chain: ScrollMetrics[],
  contentDeltaY: number
): boolean {
  if (contentDeltaY === 0) return false;
  const effective = chainInsideScrollTrap(chain);
  // A carousel (Watchlist strip, Discover rows) needs native pan so a flick can
  // glide. preventDefault on the first slightly-vertical sample kills that.
  // overflow-y: auto also computes overflow-x: auto in CSS — that is not a
  // carousel, and leftover vertical travel must still stop.
  if (effective.some(isHorizontalOnlyScroller)) {
    return false;
  }
  return !effective.some((metrics) =>
    canAbsorbVerticalScroll(metrics, contentDeltaY)
  );
}

export function scrollMetricsFromElement(el: Element): ScrollMetrics {
  const style = window.getComputedStyle(el);
  return {
    overflowY: style.overflowY,
    overflowX: style.overflowX,
    scrollTop: (el as HTMLElement).scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    isScrollTrap:
      el instanceof HTMLElement && el.hasAttribute(SCROLL_TRAP_ATTR),
  };
}

/** Ancestor chain from the touch target up to (but not including) documentElement. */
export function scrollMetricsChainFromTarget(
  target: EventTarget | null
): ScrollMetrics[] {
  const chain: ScrollMetrics[] = [];
  let el: Element | null = target instanceof Element ? target : null;
  while (el && el !== document.documentElement) {
    chain.push(scrollMetricsFromElement(el));
    el = el.parentElement;
  }
  return chain;
}
