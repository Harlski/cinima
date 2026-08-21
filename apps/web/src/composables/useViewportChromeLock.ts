import { onMounted, onUnmounted } from "vue";
import { viewportChromeCssVars } from "@/lib/viewportChrome";

const VV_VARS = ["--vv-offset-top", "--vv-height", "--vv-bottom-inset"] as const;

/**
 * Keeps fixed header and bottom tabs aligned with the visual viewport when
 * Nimiq Pay / mobile WebViews rubber-band on chrome drag.
 */
export function useViewportChromeLock() {
  function sync() {
    const vv = window.visualViewport;
    const vars = viewportChromeCssVars(
      vv ? { offsetTop: vv.offsetTop, height: vv.height } : null,
      window.innerHeight
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
  });

  onUnmounted(() => {
    window.visualViewport?.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("scroll", sync);
    window.removeEventListener("resize", sync);
    for (const key of VV_VARS) {
      document.documentElement.style.removeProperty(key);
    }
  });
}
