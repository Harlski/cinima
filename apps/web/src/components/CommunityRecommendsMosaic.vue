<template>
  <section class="mosaic-page">
    <div class="chips" role="tablist" aria-label="Recommend media type">
      <button
        v-for="chip in chips"
        :key="chip.id"
        type="button"
        role="tab"
        class="chip"
        :class="{ active: filter === chip.id }"
        :aria-selected="filter === chip.id"
        @click="filter = chip.id"
      >
        {{ chip.label }}
      </button>
    </div>

    <p v-if="!rows.length" class="empty">
      {{ emptyCopy }}
    </p>
    <div v-else class="mosaic">
      <button
        v-for="(row, index) in rows"
        :key="row.title.id"
        type="button"
        class="cell"
        :class="{
          'cell--hero': index === 0,
          'cell--tour-glow': showTourPosterGlow && index === 0,
        }"
        :aria-label="`${row.title.title}, ${recommendCountLabel(row.recommendCount)}`"
        :data-tour="
          tourFirstPoster && index === 0
            ? TOUR_SPOTLIGHT.communityRecommendPoster
            : undefined
        "
        @click="$emit('select', row.title)"
      >
        <TourSpotlight
          v-if="tourFirstPoster && index === 0"
          :id="TOUR_SPOTLIGHT.communityRecommendPoster"
          radius="12px"
          class="cell-tour-glow"
        />
        <div class="poster">
          <RecommendBadge :size="32" :count="row.recommendCount" />
          <PosterImg
            v-if="row.title.posterUrl"
            :src="row.title.posterUrl"
            :alt="row.title.title"
          />
          <div v-else class="fallback">{{ row.title.title }}</div>
        </div>
        <p v-if="index === 0" class="caption">
          {{ row.title.title }}
        </p>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { TitleSummary } from "@cinima/shared";
import PosterImg from "@/components/PosterImg.vue";
import RecommendBadge from "@/components/RecommendBadge.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import {
  communityRecommendItem,
  mosaicCommunityRecommends,
  recommendCountLabel,
  type MosaicMediaFilter,
} from "@/lib/communityRecommends";
import { TOUR_SPOTLIGHT } from "@/lib/guidedTour";
import { useGuidedTourStore } from "@/stores/guidedTour";

const props = withDefaults(
  defineProps<{
    movies: TitleSummary[];
    tv: TitleSummary[];
    tourFirstPoster?: boolean;
  }>(),
  { tourFirstPoster: false }
);

defineEmits<{
  select: [title: TitleSummary];
}>();

const tour = useGuidedTourStore();
const filter = ref<MosaicMediaFilter>("all");
const chips = [
  { id: "all" as const, label: "All" },
  { id: "movie" as const, label: "Movies" },
  { id: "tv" as const, label: "TV" },
];

const movieItems = computed(() => props.movies.map(communityRecommendItem));
const tvItems = computed(() => props.tv.map(communityRecommendItem));
const rows = computed(() =>
  mosaicCommunityRecommends(movieItems.value, tvItems.value, filter.value)
);
const emptyCopy = computed(() => {
  if (filter.value === "movie") return "No movie Recommends yet.";
  if (filter.value === "tv") return "No TV Recommends yet.";
  return "No community Recommends yet.";
});
const showTourPosterGlow = computed(
  () =>
    Boolean(props.tourFirstPoster) &&
    tour.isSpotlight(TOUR_SPOTLIGHT.communityRecommendPoster)
);
</script>

<style scoped>
.mosaic-page {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.chips {
  display: flex;
  gap: 0.15rem;
  padding: 0.15rem;
  margin-inline: auto;
  border-radius: 999px;
  background: var(--bg-surface);
  width: fit-content;
  max-width: 100%;
}

.chip {
  padding: 0.32rem 0.8rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 650;
  cursor: pointer;
}

.chip.active {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.empty {
  margin: 0;
  padding: 1rem;
  border-radius: 12px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.mosaic {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 6.4rem;
  gap: 0.45rem;
  overflow: visible;
}

.cell {
  position: relative;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: visible;
  -webkit-tap-highlight-color: transparent;
}

.cell--hero {
  grid-column: span 2;
  grid-row: span 2;
}

.cell--tour-glow {
  z-index: 5;
}

.cell-tour-glow {
  position: absolute;
  inset: -2px;
  z-index: 3;
  pointer-events: none;
  border-radius: 14px;
}

.cell :deep(.cell-tour-glow .gold-glow-content) {
  display: none;
}

.poster {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
  background: var(--bg-surface);
  border-radius: 12px;
}

.poster :deep(.poster-img) {
  overflow: hidden;
  border-radius: 12px;
}

.poster :deep(.poster-img),
.poster :deep(.poster-img img),
.poster :deep(.poster-img-wait) {
  width: 100%;
  height: 100%;
}

.poster :deep(.poster-img img) {
  object-fit: cover;
  display: block;
}

.fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.4rem;
  border-radius: 12px;
  text-align: center;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.caption {
  position: absolute;
  left: 0.55rem;
  right: 0.55rem;
  bottom: 0.5rem;
  z-index: 2;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--text-primary);
  pointer-events: none;
  text-shadow:
    0 1px 2px #000,
    0 6px 16px color-mix(in oklch, var(--colors-neutral) 80%, transparent);
}

.cell--hero::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 12px;
  background: linear-gradient(
    to top,
    color-mix(in oklch, var(--colors-neutral) 72%, transparent) 0%,
    transparent 46%
  );
  pointer-events: none;
}
</style>
