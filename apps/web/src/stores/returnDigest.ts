import { defineStore } from "pinia";
import { ref } from "vue";
import {
  shouldShowReturnDigest,
  type ReturnDigest,
} from "@cinima/shared";

export const useReturnDigestStore = defineStore("returnDigest", () => {
  const digest = ref<ReturnDigest | null>(null);
  const meTabHint = ref(false);
  let hintTimer: ReturnType<typeof setTimeout> | null = null;

  function apply(
    next: ReturnDigest | null,
    opts: { onboarding: boolean; tourActive: boolean }
  ) {
    if (!next) return;
    if (
      !shouldShowReturnDigest({
        thanksCount: next.thanksCount,
        nimReceived: next.nimReceived,
        onboarding: opts.onboarding,
        tourActive: opts.tourActive,
      })
    ) {
      return;
    }
    digest.value = next;
  }

  function dismiss() {
    digest.value = null;
  }

  function flashMeTab() {
    meTabHint.value = true;
    if (hintTimer != null) window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      meTabHint.value = false;
      hintTimer = null;
    }, 700);
  }

  return { digest, meTabHint, apply, dismiss, flashMeTab };
});
