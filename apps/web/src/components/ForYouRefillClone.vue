<template>
  <div ref="rootEl" class="for-you-refill">
    <div
      class="for-you-refill-poster"
      :class="{ 'for-you-refill-poster--selected': flight.selected }"
    >
      <PosterImg
        v-if="flight.posterUrl"
        :src="flight.posterUrl"
        :alt="flight.titleName"
        :spinner-size="22"
      />
      <div v-else class="for-you-refill-fallback">{{ flight.titleName }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import PosterImg from "@/components/PosterImg.vue";
import {
  FOR_YOU_REFILL_LAND_MS,
  FOR_YOU_REFILL_MS,
  forYouRefillLandKeyframes,
  forYouRefillStart,
} from "@/lib/forYouPass";
import type { ForYouRefill } from "@/stores/forYouMotion";

const props = defineProps<{
  flight: ForYouRefill;
}>();

const emit = defineEmits<{
  done: [id: number];
}>();

const rootEl = ref<HTMLElement | null>(null);
const timers: ReturnType<typeof setTimeout>[] = [];
const motions: Animation[] = [];
let finished = false;

function playLand(node: HTMLElement): Animation {
  const frames = forYouRefillLandKeyframes().map((frame) => ({
    transform: `translate(0, 0) scale(${frame.x}, ${frame.y})`,
    opacity: 1,
    offset: frame.offset,
  }));
  const land = node.animate(frames, {
    duration: FOR_YOU_REFILL_LAND_MS,
    easing: "cubic-bezier(0.22, 0.08, 0.18, 1)",
    fill: "forwards",
  });
  motions.push(land);
  return land;
}

function freezeClone() {
  const node = rootEl.value;
  if (!node) return;
  node.style.visibility = "hidden";
  for (const motion of motions) {
    try {
      motion.commitStyles();
    } catch {
      /* already finished or cancelled */
    }
  }
}

function finish() {
  if (finished) return;
  finished = true;
  emit("done", props.flight.id);
  freezeClone();
}

onMounted(() => {
  const node = rootEl.value;
  const { dx, dy } = forYouRefillStart(props.flight.from, props.flight.to);
  if (node) {
    node.style.transform = `translate(${dx}px, ${dy}px)`;
    node.style.opacity = "0";
  }
  const delay = props.flight.delayMs;
  timers.push(
    window.setTimeout(() => {
      if (!node) {
        finish();
        return;
      }
      const flight = node.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(1, 1)`,
            opacity: 0.92,
          },
          {
            transform: "translate(0, 0) scale(1, 1)",
            opacity: 1,
          },
        ],
        {
          duration: FOR_YOU_REFILL_MS,
          easing: "cubic-bezier(0.22, 0.08, 0.18, 1)",
          fill: "forwards",
        }
      );
      motions.push(flight);
      void flight.finished
        .then(() => playLand(node).finished)
        .then(() => finish())
        .catch(() => finish());
    }, delay)
  );
  timers.push(
    window.setTimeout(
      () => finish(),
      delay + FOR_YOU_REFILL_MS + FOR_YOU_REFILL_LAND_MS + 32
    )
  );
});

onUnmounted(() => {
  for (const timer of timers) window.clearTimeout(timer);
  freezeClone();
});
</script>

<style scoped>
.for-you-refill {
  width: 100%;
  height: 100%;
  transform-origin: center bottom;
}

.for-you-refill-poster {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-surface);
  transform: scale(0.92);
  opacity: 0.72;
}

.for-you-refill-poster--selected {
  border-color: var(--gold);
  transform: scale(1);
  opacity: 1;
}

.for-you-refill-poster :deep(.poster-img),
.for-you-refill-poster :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.for-you-refill-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.4rem;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
}
</style>
