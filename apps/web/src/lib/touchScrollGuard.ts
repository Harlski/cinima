export type ScrollMetrics = {
  overflowY: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

const SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);

/**
 * Positive contentDeltaY = finger moved up (content wants to scroll down).
 * Negative = finger moved down (content wants to scroll up / pull-to-refresh).
 */
export function canAbsorbVerticalScroll(
  metrics: ScrollMetrics,
  contentDeltaY: number
): boolean {
  if (contentDeltaY === 0) return false;
  if (!SCROLLABLE_OVERFLOW.has(metrics.overflowY)) return false;
  if (metrics.scrollHeight <= metrics.clientHeight + 1) return false;

  if (contentDeltaY < 0) {
    return metrics.scrollTop > 0;
  }
  return metrics.scrollTop + metrics.clientHeight < metrics.scrollHeight - 1;
}

/**
 * True when a vertical drag has no scroll container that can move further —
 * the case that rubber-bands Nimiq Pay / mobile WebViews and slides content
 * under fixed chrome.
 */
export function shouldBlockRubberBandScroll(
  chain: ScrollMetrics[],
  contentDeltaY: number
): boolean {
  if (contentDeltaY === 0) return false;
  return !chain.some((metrics) =>
    canAbsorbVerticalScroll(metrics, contentDeltaY)
  );
}

export function scrollMetricsFromElement(el: Element): ScrollMetrics {
  const style = window.getComputedStyle(el);
  return {
    overflowY: style.overflowY,
    scrollTop: (el as HTMLElement).scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
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
