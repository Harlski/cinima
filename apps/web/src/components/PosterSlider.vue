<template>
  <div v-if="!titles.length" class="empty">{{ empty }}</div>
  <div
    v-else
    ref="rootEl"
    class="poster-slider"
    :class="{ 'poster-slider--rows': rowCount > 1 }"
    :style="rowCount > 1 ? { '--poster-rows': rowCount } : undefined"
    role="list"
  >
    <button
      v-for="title in titles"
      :key="title.id"
      type="button"
      class="media-item"
      role="listitem"
      :aria-label="title.title"
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
import { onUnmounted, ref, watch } from "vue";
import type { TitleSummary } from "@cinima/shared";
import PosterImg from "@/components/PosterImg.vue";
import RecommendBadge from "@/components/RecommendBadge.vue";
import { posterSliderRowCount } from "@/lib/posterSliderRows";

const props = withDefaults(
  defineProps<{
    titles: TitleSummary[];
    gold?: "always" | "recommended";
    empty?: string;
    /** Max strip rows when titles overflow one row (default 1) */
    maxRows?: number;
  }>(),
  {
    gold: "recommended",
    empty: "None yet",
    maxRows: 1,
  }
);

defineEmits<{
  select: [title: TitleSummary];
}>();

const rootEl = ref<HTMLElement | null>(null);
const rowCount = ref(1);

let observer: ResizeObserver | null = null;

function measureRows() {
  const el = rootEl.value;
  if (!el) {
    rowCount.value = 1;
    return;
  }

  const item = el.querySelector(".media-item");
  const posterWidth =
    item instanceof HTMLElement ? item.getBoundingClientRect().width : 0;
  const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;

  rowCount.value = posterSliderRowCount({
    itemCount: props.titles.length,
    containerWidth: el.clientWidth,
    posterWidth,
    gap,
    maxRows: props.maxRows,
  });
}

watch(
  rootEl,
  (el) => {
    observer?.disconnect();
    observer = null;
    if (!el) {
      rowCount.value = 1;
      return;
    }
    observer = new ResizeObserver(() => measureRows());
    observer.observe(el);
    measureRows();
  },
  { flush: "post" }
);

watch(
  () => [props.titles.length, props.maxRows] as const,
  () => measureRows(),
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
  grid-auto-flow: column;
  grid-auto-columns: 7.25rem;
  align-content: start;
}

.poster-slider--rows .media-item {
  scroll-snap-align: start;
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
    grid-auto-columns: 8.25rem;
    grid-template-rows: repeat(var(--poster-rows), calc(8.25rem * 3 / 2));
  }
}
</style>
