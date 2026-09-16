import { onMounted, onUnmounted } from "vue";
import { SCROLL_TRAP_ATTR } from "@/lib/touchScrollGuard";
import { viewportChromeCssVars } from "@/lib/viewportChrome";

const VV_VARS = ["--vv-offset-top", "--vv-height", "--vv-bottom-inset"] as const;

/**
 * Keeps fixed header and bottom tabs aligned with the visual viewport when
 * Nimiq Pay / mobile WebViews rubber-band on chrome drag. Overlay traps freeze
 * those offsets so a modal swipe cannot deform the page.
 */
export function useViewportChromeLock() {
  let observer: MutationObserver | null = null;

  function sync() {
    const vv = window.visualViewport;
    const freeze = !!document.querySelector(`[${SCROLL_TRAP_ATTR}]`);
    const vars = viewportChromeCssVars(
      vv ? { offsetTop: vv.offsetTop, height: vv.height } : null,
      window.innerHeight,
      { freeze }
    );
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value);
    }
  }

  onMounted(() => {
    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [SCROLL_TRAP_ATTR],
    });
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
    window.visualViewport?.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("scroll", sync);
    window.removeEventListener("resize", sync);
    for (const key of VV_VARS) {
      document.documentElement.style.removeProperty(key);
    }
  });
}
