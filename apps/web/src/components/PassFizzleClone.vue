<template>
  <div ref="rootEl" class="pass-fizzle" :style="liveStyle">
    <div class="pass-fizzle-poster">
      <PosterImg
        v-if="flight.posterUrl"
        :src="flight.posterUrl"
        :alt="flight.titleName"
        :spinner-size="22"
      />
      <div v-else class="pass-fizzle-fallback">{{ flight.titleName }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import PosterImg from "@/components/PosterImg.vue";
import { PASS_FIZZLE_MS, passFizzleAt } from "@/lib/forYouPass";
import type { PassFizzle } from "@/stores/forYouMotion";

const props = defineProps<{
  flight: PassFizzle;
}>();

const emit = defineEmits<{
  done: [];
}>();

const rootEl = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let anim: Animation | null = null;

const liveStyle = computed(() => {
  const point = passFizzleAt(
    props.flight.progress,
    props.flight.from,
    props.flight.to
  );
  return {
    transform: `translate(${point.x}px, ${point.y}px) scale(${point.scale})`,
    opacity: String(point.opacity),
  };
});

function playCommit() {
  const node = rootEl.value;
  if (!node) return;
  const fromT = props.flight.progress;
  const steps = 8;
  const frames = [];
  for (let i = 0; i <= steps; i++) {
    const t = fromT + (1 - fromT) * (i / steps);
    const point = passFizzleAt(t, props.flight.from, props.flight.to);
    frames.push({
      transform: `translate(${point.x}px, ${point.y}px) scale(${point.scale})`,
      opacity: point.opacity,
      filter: `blur(${8 * t}px)`,
    });
  }
  const duration = Math.max(320, PASS_FIZZLE_MS * (1 - fromT));
  anim = node.animate(frames, {
    duration,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "forwards",
  });
  timer = window.setTimeout(() => emit("done"), duration + 40);
}

watch(
  () => props.flight.phase,
  (phase) => {
    if (phase === "commit") playCommit();
  }
);

onMounted(() => {
  if (props.flight.phase === "commit") playCommit();
});

onUnmounted(() => {
  anim?.cancel();
  if (timer) window.clearTimeout(timer);
});
</script>

<style scoped>
.pass-fizzle {
  width: 100%;
  height: 100%;
}

.pass-fizzle-poster {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface);
  box-shadow: 0 18px 36px color-mix(in oklch, var(--colors-neutral) 34%, transparent);
}

.pass-fizzle-poster :deep(.poster-img),
.pass-fizzle-poster :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.pass-fizzle-fallback {
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
