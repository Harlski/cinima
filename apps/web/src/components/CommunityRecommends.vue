<template>
  <section v-if="showSection" class="community" :class="{ 'community--inset': inset }">
    <h3 v-if="heading">{{ heading }}</h3>

    <div v-if="showMovies" class="community-section">
      <h4 v-if="showSectionHeadings">Movies</h4>
      <PosterSlider
        :titles="movies"
        gold="always"
        fit
        :max-rows="maxRows"
        empty="No movie Recommends yet"
        @select="$emit('select', $event)"
      />
    </div>

    <div v-if="showTv" class="community-section">
      <h4 v-if="showSectionHeadings">TV Shows</h4>
      <PosterSlider
        :titles="tv"
        gold="always"
        fit
        :max-rows="maxRows"
        empty="No TV Recommends yet"
        @select="$emit('select', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { MediaType, TitleSummary } from "@cinima/shared";
import PosterSlider from "@/components/PosterSlider.vue";

const props = withDefaults(
  defineProps<{
    movies: TitleSummary[];
    tv: TitleSummary[];
    /** Restrict to one media type; omit to show both when non-empty. */
    kind?: MediaType | "both";
    heading?: string | null;
    maxRows?: number;
    /** Extra top spacing for nested empty states */
    inset?: boolean;
  }>(),
  {
    kind: "both",
    heading: "What others on Cinima recommend",
    maxRows: 2,
    inset: false,
  }
);

defineEmits<{
  select: [title: TitleSummary];
}>();

const showMovies = computed(
  () =>
    (props.kind === "both" || props.kind === "movie") && props.movies.length > 0
);
const showTv = computed(
  () => (props.kind === "both" || props.kind === "tv") && props.tv.length > 0
);
const showSection = computed(() => showMovies.value || showTv.value);
const showSectionHeadings = computed(() => props.kind === "both");
</script>

<style scoped>
.community {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  text-align: left;
}

.community--inset {
  margin-top: 1rem;
}

.community h3 {
  margin: 0;
  padding-inline: 1rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
}

.community-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.community-section h4 {
  margin: 0;
  padding-inline: 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-secondary);
}
</style>
