import { onMounted, onUnmounted, type Ref } from "vue";
import {
  nestedScrollHandoff,
  scrollMetricsFromElement,
} from "@/lib/touchScrollGuard";

function htmlChainFromTarget(target: EventTarget | null): HTMLElement[] {
  const chain: HTMLElement[] = [];
  let el: Element | null = target instanceof Element ? target : null;
  while (el && el !== document.documentElement) {
    if (el instanceof HTMLElement) chain.push(el);
    el = el.parentElement;
  }
  return chain;
}

function applyHandoff(
  target: EventTarget | null,
  contentDeltaY: number
): boolean {
  const els = htmlChainFromTarget(target);
  const handoff = nestedScrollHandoff(
    els.map(scrollMetricsFromElement),
    contentDeltaY
  );
  if (!handoff) return false;
  els[handoff.nestedIndex].scrollTop += handoff.nestedDelta;
  els[handoff.ancestorIndex].scrollTop += handoff.ancestorDelta;
  return true;
}

/**
 * When a nested overflow box (episode ratings) hits its end, continue the
 * gesture on the page scroller instead of trapping the finger.
 */
export function useNestedScrollChain(root: Ref<HTMLElement | null>) {
  let lastX = 0;
  let lastY = 0;
  let tracking = false;
  let el: HTMLElement | null = null;

  function onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) {
      tracking = false;
      return;
    }
    tracking = true;
    lastX = event.touches[0].clientX;
    lastY = event.touches[0].clientY;
  }

  function onTouchMove(event: TouchEvent) {
    if (!tracking || event.touches.length !== 1) return;
    const { clientX, clientY } = event.touches[0];
    const deltaX = lastX - clientX;
    const deltaY = lastY - clientY;
    lastX = clientX;
    lastY = clientY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) return;
    if (applyHandoff(event.target, deltaY)) event.preventDefault();
  }

  function onTouchEnd() {
    tracking = false;
  }

  function onWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (applyHandoff(event.target, event.deltaY)) event.preventDefault();
  }

  onMounted(() => {
    el = root.value;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true, capture: true });
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
  });

  onUnmounted(() => {
    if (!el) return;
    el.removeEventListener("touchstart", onTouchStart, true);
    el.removeEventListener("touchmove", onTouchMove, true);
    el.removeEventListener("touchend", onTouchEnd, true);
    el.removeEventListener("touchcancel", onTouchEnd, true);
    el.removeEventListener("wheel", onWheel, true);
    el = null;
  });
}
