export type MobileHintSignals = {
  userAgent: string;
  maxTouchPoints: number;
  pointerCoarse: boolean;
};

/**
 * Heuristic for phone / tablet / Pay WebView vs a mouse desktop.
 * Prefers classifying ambiguous devices as mobile so the desktop-only
 * gate note does not appear on real phones.
 */
export function seemsLikeMobile(signals: MobileHintSignals): boolean {
  if (
    /\b(Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|NimiqPay)\b/i.test(
      signals.userAgent
    )
  ) {
    return true;
  }
  if (signals.pointerCoarse) return true;
  if (signals.maxTouchPoints > 1) return true;
  return false;
}

export function readMobileHintSignals(): MobileHintSignals {
  return {
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    maxTouchPoints:
      typeof navigator !== "undefined" ? navigator.maxTouchPoints ?? 0 : 0,
    pointerCoarse:
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
  };
}
