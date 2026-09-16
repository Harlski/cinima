import { onMounted, onUnmounted } from "vue";
import {
  scrollMetricsChainFromTarget,
  shouldBlockRubberBandScroll,
} from "@/lib/touchScrollGuard";

/**
 * Stops vertical rubber-band / overscroll when no ancestor can absorb the
 * gesture, including overlay chrome marked data-scroll-trap. Needed in Nimiq
 * Pay WebViews where overscroll-behavior alone is not enough and content
 * slides under the fixed header.
 */
export function useTouchScrollGuard() {
  let lastX = 0;
  let lastY = 0;
  let tracking = false;

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

    // Horizontal carousels (Discover rows, onboarding) keep native pan-x.
    if (Math.abs(deltaX) > Math.abs(deltaY)) return;
    preventIfBlocked(event.target, deltaY, event);
  }

  function onTouchEnd() {
    tracking = false;
  }

  function onWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    preventIfBlocked(event.target, event.deltaY, event);
  }

  function preventIfBlocked(
    target: EventTarget | null,
    deltaY: number,
    event: Event
  ) {
    const chain = scrollMetricsChainFromTarget(target);
    if (shouldBlockRubberBandScroll(chain, deltaY)) {
      event.preventDefault();
    }
  }

  onMounted(() => {
    document.addEventListener("touchstart", onTouchStart, {
      passive: true,
      capture: true,
    });
    document.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    document.addEventListener("touchend", onTouchEnd, {
      passive: true,
      capture: true,
    });
    document.addEventListener("touchcancel", onTouchEnd, {
      passive: true,
      capture: true,
    });
    document.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });
  });

  onUnmounted(() => {
    document.removeEventListener("touchstart", onTouchStart, true);
    document.removeEventListener("touchmove", onTouchMove, true);
    document.removeEventListener("touchend", onTouchEnd, true);
    document.removeEventListener("touchcancel", onTouchEnd, true);
    document.removeEventListener("wheel", onWheel, true);
  });
}
