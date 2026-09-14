import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { shouldShowJoinOverlay } from "@cinima/shared";
import { useApi } from "@/composables/useApi";

export const useJoinOverlayStore = defineStore("joinOverlay", () => {
  const pending = ref(false);
  const previewing = ref(false);
  const { request } = useApi();

  const open = computed(() => pending.value || previewing.value);

  function offer() {
    pending.value = true;
  }

  function preview() {
    previewing.value = true;
  }

  function visible(opts: { onboarding: boolean; tourActive: boolean }): boolean {
    return shouldShowJoinOverlay({
      pending: open.value,
      onboarding: opts.onboarding,
      tourActive: opts.tourActive,
    });
  }

  async function ack() {
    const wasPreview = previewing.value;
    pending.value = false;
    previewing.value = false;
    if (wasPreview) return;
    try {
      await request("/me/join-overlay", { method: "POST" });
    } catch {
      /* overlay already dismissed locally */
    }
  }

  function dismissPreview() {
    previewing.value = false;
  }

  return { pending, previewing, open, offer, preview, visible, ack, dismissPreview };
});
