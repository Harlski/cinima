import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { achievementHow, achievementTitle, type AchievementKind } from "@cinima/shared";
import {
  currentMarquee,
  dismissMarquee,
  emptyMarqueeQueue,
  enqueueMarquee,
} from "@/lib/marqueeQueue";

const AUTO_DISMISS_MS = 5000;

export const useMarqueeStore = defineStore("marquee", () => {
  const queue = ref(emptyMarqueeQueue());
  let timer: ReturnType<typeof setTimeout> | null = null;

  const current = computed(() => currentMarquee(queue.value));
  const title = computed(() =>
    current.value ? achievementTitle(current.value.kind) : null
  );
  const how = computed(() =>
    current.value ? achievementHow(current.value.kind) : null
  );

  function clearTimer() {
    if (timer == null) return;
    clearTimeout(timer);
    timer = null;
  }

  function armTimer() {
    clearTimer();
    if (!current.value) return;
    timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
  }

  function enqueue(kinds: readonly AchievementKind[]) {
    for (const kind of kinds) {
      queue.value = enqueueMarquee(queue.value, { kind });
    }
    if (kinds.length) armTimer();
  }

  function dismiss() {
    clearTimer();
    queue.value = dismissMarquee(queue.value);
    armTimer();
  }

  return { current, title, how, enqueue, dismiss };
});
