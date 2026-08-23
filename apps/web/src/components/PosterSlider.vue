<template>
  <div v-if="!titles.length" class="empty">{{ empty }}</div>
  <div
    v-else
    ref="rootEl"
    class="poster-slider"
    :class="{
      'poster-slider--rows': !fit && rowCount > 1,
      'poster-slider--fit': fit,
    }"
    :style="gridVars"
    role="list"
  >
    <button
      v-for="(title, index) in titles"
      :key="title.id"
      type="button"
      class="media-item"
      role="listitem"
      :aria-label="title.title"
      :style="itemGridStyle(index)"
      @click="$emit('select', title)"
    >
      <RecommendBadge v-if="showGold(title)" />
      <PosterImg v-if="title.posterUrl" :src="title.posterUrl" alt="" />
      <div v-else class="poster-placeholder">
        {{ title.title }}
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import type { TitleSummary } from "@cinima/shared";
import PosterImg from "@/components/PosterImg.vue";
import RecommendBadge from "@/components/RecommendBadge.vue";
import {
  posterFitLayout,
  posterSliderItemSlot,
  posterSliderLayout,
} from "@/lib/posterSliderRows";

const props = withDefaults(
  defineProps<{
    titles: TitleSummary[];
    gold?: "always" | "recommended";
    empty?: string;
    /** Max strip rows when titles overflow one row (default 1) */
    maxRows?: number;
    /** Size posters to the container width; no horizontal scroll */
    fit?: boolean;
  }>(),
  {
    gold: "recommended",
    empty: "None yet",
    maxRows: 1,
    fit: false,
  }
);

defineEmits<{
  select: [title: TitleSummary];
}>();

const rootEl = ref<HTMLElement | null>(null);
const rowCount = ref(1);
const colCount = ref(1);

let observer: ResizeObserver | null = null;

const gridVars = computed(() => {
  if (props.fit) {
    return { "--poster-cols": colCount.value };
  }
  if (rowCount.value > 1) {
    return { "--poster-rows": rowCount.value, "--poster-cols": colCount.value };
  }
  return undefined;
});

function cssPosterWidthPx(): number {
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const wide = window.matchMedia("(min-width: 640px)").matches;
  return (wide ? 8.25 : 7.25) * rem;
}

function measureLayout() {
  const el = rootEl.value;
  if (!el) {
    rowCount.value = 1;
    colCount.value = 1;
    return;
  }

  if (props.fit) {
    const layout = posterFitLayout({
      itemCount: props.titles.length,
      maxRows: props.maxRows,
    });
    rowCount.value = layout.rows;
    colCount.value = layout.cols;
    return;
  }

  const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
  const layout = posterSliderLayout({
    itemCount: props.titles.length,
    containerWidth: el.clientWidth,
    posterWidth: cssPosterWidthPx(),
    gap,
    maxRows: props.maxRows,
  });
  rowCount.value = layout.rows;
  colCount.value = layout.cols;
}

function itemGridStyle(index: number): Record<string, number> | undefined {
  if (props.fit) {
    // Equal 1fr columns + default row flow is enough.
    return undefined;
  }
  if (rowCount.value <= 1) return undefined;
  const { row, col } = posterSliderItemSlot(index, colCount.value);
  return { gridRow: row, gridColumn: col };
}

watch(
  rootEl,
  (el) => {
    observer?.disconnect();
    observer = null;
    if (!el) {
      rowCount.value = 1;
      colCount.value = 1;
      return;
    }
    if (!props.fit) {
      observer = new ResizeObserver(() => measureLayout());
      observer.observe(el);
    }
    measureLayout();
  },
  { flush: "post" }
);

watch(
  () => [props.titles.length, props.maxRows, props.fit] as const,
  () => measureLayout(),
  { flush: "post" }
);

onUnmounted(() => observer?.disconnect());

function showGold(title: TitleSummary): boolean {
  return props.gold === "always" || Boolean(title.recommended);
}
</script>

<style scoped>
.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 1.5rem 0.5rem;
  background: var(--bg-surface);
  border-radius: 10px;
}

.poster-slider {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 0;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.35rem;
  scrollbar-width: thin;
}

.poster-slider--rows {
  display: grid;
  grid-template-rows: repeat(var(--poster-rows), calc(7.25rem * 3 / 2));
  grid-template-columns: repeat(var(--poster-cols), 7.25rem);
  grid-auto-flow: row;
  align-content: start;
  justify-content: start;
}

.poster-slider--rows .media-item {
  scroll-snap-align: start;
  width: 100%;
  height: 100%;
  flex: unset;
}

.poster-slider--fit {
  display: grid;
  width: 100%;
  gap: 0.75rem;
  overflow: hidden;
  scroll-snap-type: none;
  padding-bottom: 0;
  scrollbar-width: none;
  grid-template-columns: repeat(var(--poster-cols), minmax(0, 1fr));
  grid-auto-flow: row;
  justify-content: stretch;
}

.poster-slider--fit .media-item {
  flex: unset;
  width: 100%;
  min-width: 0;
  aspect-ratio: 2 / 3;
}

.media-item {
  position: relative;
  flex: 0 0 7.25rem;
  aspect-ratio: 2 / 3;
  padding: 0;
  border: 0;
  background: var(--bg-surface);
  border-radius: 10px;
  overflow: hidden;
  scroll-snap-align: start;
  cursor: pointer;
  color: inherit;
}

.media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@media (min-width: 640px) {
  .media-item {
    flex-basis: 8.25rem;
  }

  .poster-slider--rows {
    grid-template-columns: repeat(var(--poster-cols), 8.25rem);
    grid-template-rows: repeat(var(--poster-rows), calc(8.25rem * 3 / 2));
  }
}
</style>
