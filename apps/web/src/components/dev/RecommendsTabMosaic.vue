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

    <div class="mosaic" role="list">
      <div
        v-for="(row, index) in rows"
        :key="row.title.id"
        class="cell"
        :class="{ 'cell--hero': index === 0 }"
        role="listitem"
        :aria-label="`${row.title.title}, ${recommendCountLabel(row.recommendCount)}`"
      >
        <RecommendsTabPoster :title="row.title" size="mosaic" />
        <p v-if="index === 0" class="caption">
          {{ row.title.title }}
          <span>{{ recommendCountLabel(row.recommendCount) }}</span>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import RecommendsTabPoster from "@/components/dev/RecommendsTabPoster.vue";
import {
  mosaicCommunityRecommends,
  recommendCountLabel,
  type MosaicMediaFilter,
  type RecommendsTabLabFixture,
} from "@/lib/recommendsTabLab";

const props = defineProps<{
  fixture: RecommendsTabLabFixture;
}>();

const filter = ref<MosaicMediaFilter>("all");
const chips = [
  { id: "all" as const, label: "All" },
  { id: "movie" as const, label: "Movies" },
  { id: "tv" as const, label: "TV" },
];

const rows = computed(() => mosaicCommunityRecommends(props.fixture, filter.value));
</script>

<style scoped>
.mosaic-page {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-inline: var(--column-pad);
}

.chips {
  display: flex;
  gap: 0.15rem;
  padding: 0.15rem;
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

.mosaic {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 6.4rem;
  gap: 0.45rem;
}

.cell {
  min-width: 0;
}

.cell--hero {
  grid-column: span 2;
  grid-row: span 2;
  position: relative;
}

.cell :deep(.poster) {
  height: 100%;
}

.caption {
  position: absolute;
  left: 0.55rem;
  right: 0.55rem;
  bottom: 0.5rem;
  z-index: 2;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--text-primary);
  text-shadow:
    0 1px 2px #000,
    0 6px 16px color-mix(in oklch, var(--colors-neutral) 80%, transparent);
}

.caption span {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--gold);
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
