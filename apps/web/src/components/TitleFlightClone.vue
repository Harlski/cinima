<template>
  <div ref="rootEl" class="title-flight" :style="boxStyle">
    <div
      class="title-flight-inner"
      :class="{ 'title-flight-inner--react': flight.kind === 'recommend' }"
    >
      <div
        v-if="flight.kind === 'recommend'"
        class="title-flight-glow"
        :class="{ 'is-on': glowOn }"
      >
        <GoldGlowShell radius="12px">
          <div class="title-flight-poster">
            <RecommendBadge v-if="hexOn" />
            <PosterImg
              v-if="flight.posterUrl"
              :src="flight.posterUrl"
              :alt="flight.titleName"
              :spinner-size="22"
            />
            <div v-else class="title-flight-fallback">{{ flight.titleName }}</div>
          </div>
        </GoldGlowShell>
      </div>
      <div v-else class="title-flight-poster">
        <PosterImg
          v-if="flight.posterUrl"
          :src="flight.posterUrl"
          :alt="flight.titleName"
          :spinner-size="22"
        />
        <div v-else class="title-flight-fallback">{{ flight.titleName }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import GoldGlowShell from "@/components/GoldGlowShell.vue";
import PosterImg from "@/components/PosterImg.vue";
import RecommendBadge from "@/components/RecommendBadge.vue";
import {
  TITLE_FLIGHT_GLOW_AT_MS,
  TITLE_FLIGHT_GLOW_IN_MS,
  TITLE_FLIGHT_HEX_AT_MS,
  TITLE_FLIGHT_HEX_IN_MS,
  TITLE_FLIGHT_MS,
  TITLE_FLIGHT_REACT_MS,
  TITLE_FLIGHT_TARGET_ATTR,
  titleFlightFly,
  titleFlightHintAtMs,
  titleFlightSettleMs,
  titleFlightTab,
} from "@/lib/titleFlight";
import type { TitleFlight } from "@/stores/titleFlight";

const props = defineProps<{
  flight: TitleFlight;
}>();

const emit = defineEmits<{
  hint: [];
  done: [];
}>();

const rootEl = ref<HTMLElement | null>(null);
const hexOn = ref(false);
const glowOn = ref(false);
const timers: ReturnType<typeof setTimeout>[] = [];

const boxStyle = computed(() => ({
  left: `${props.flight.from.left}px`,
  top: `${props.flight.from.top}px`,
  width: `${props.flight.from.width}px`,
  height: `${props.flight.from.height}px`,
  "--title-flight-react": `${TITLE_FLIGHT_REACT_MS}ms`,
  "--title-flight-glow": `${TITLE_FLIGHT_GLOW_IN_MS}ms`,
  "--title-flight-hex": `${TITLE_FLIGHT_HEX_IN_MS}ms`,
}));

function tabBox() {
  const tab = titleFlightTab(props.flight.kind);
  const el = document.querySelector(`[${TITLE_FLIGHT_TARGET_ATTR}="${tab}"]`);
  const icon =
    tab === "me"
      ? el?.querySelector(".tab-identicon")
      : el?.querySelector(".nq-icon");
  const target = icon ?? el;
  return target instanceof Element ? target.getBoundingClientRect() : null;
}

function startFly() {
  const node = rootEl.value;
  const to = tabBox();
  if (!node || !to) return;
  const { dx, dy, scale } = titleFlightFly(node.getBoundingClientRect(), to);
  node.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
    ],
    {
      duration: TITLE_FLIGHT_MS,
      easing: "cubic-bezier(0.4, 0, 0.15, 1)",
      fill: "forwards",
    }
  );
}

function later(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms));
}

onMounted(() => {
  later(titleFlightHintAtMs(props.flight.kind), () => emit("hint"));
  later(titleFlightSettleMs(props.flight.kind) + 40, () => emit("done"));
  if (props.flight.kind === "recommend") {
    later(TITLE_FLIGHT_HEX_AT_MS, () => {
      hexOn.value = true;
    });
    later(TITLE_FLIGHT_GLOW_AT_MS, () => {
      glowOn.value = true;
    });
    later(titleFlightSettleMs(props.flight.kind) - TITLE_FLIGHT_MS, startFly);
    return;
  }
  startFly();
});

onUnmounted(() => {
  for (const timer of timers) window.clearTimeout(timer);
});
</script>

<style scoped>
.title-flight {
  position: fixed;
  z-index: 55;
  pointer-events: none;
  transform-origin: center center;
  overflow: visible;
}

.title-flight-inner {
  width: 100%;
  height: 100%;
}

.title-flight-inner--react {
  animation: title-flight-react var(--title-flight-react, 180ms)
    cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}

.title-flight-glow {
  width: 100%;
  height: 100%;
}

.title-flight-glow :deep(.gold-glow-shell::before),
.title-flight-glow :deep(.gold-glow-shell::after) {
  transition: opacity var(--title-flight-glow, 260ms) ease;
}

.title-flight-glow:not(.is-on) :deep(.gold-glow-shell::before),
.title-flight-glow:not(.is-on) :deep(.gold-glow-shell::after) {
  opacity: 0;
}

.title-flight-glow :deep(.gold-glow-content) {
  width: 100%;
  height: 100%;
}

.title-flight-poster {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface);
  box-shadow: 0 12px 28px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.title-flight-poster :deep(.recommend-badge) {
  animation: title-flight-hex var(--title-flight-hex, 220ms)
    cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}

.title-flight-poster :deep(.poster-img),
.title-flight-poster :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.title-flight-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.4rem;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
}

@keyframes title-flight-react {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.06);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes title-flight-hex {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .title-flight-inner--react {
    animation: none;
  }

  .title-flight-poster :deep(.recommend-badge) {
    animation: none;
  }

  .title-flight-glow :deep(.gold-glow-shell::before),
  .title-flight-glow :deep(.gold-glow-shell::after) {
    transition: none;
  }
}
</style>
