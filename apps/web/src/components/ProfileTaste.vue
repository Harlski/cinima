<template>
  <section class="media-section">
    <div class="section-heading">
      <h2>Recommends</h2>
      <KindTabs v-model="mediaKind" aria-label="Recommend media type" />
    </div>
    <PosterSlider
      :titles="visibleRecommends"
      gold="always"
      :max-rows="2"
      :empty="mediaKind === 'tv' ? 'No TV Recommends yet' : 'No movie Recommends yet'"
      @select="$emit('select', $event)"
    />
  </section>

  <section class="media-section">
    <div class="section-heading">
      <h2>Favorites</h2>
      <KindTabs v-model="mediaKind" aria-label="Favorite media type" />
    </div>
    <PosterSlider
      :titles="visibleFavorites"
      gold="recommended"
      :max-rows="2"
      :empty="mediaKind === 'tv' ? 'No TV shows yet' : 'No movies yet'"
      @select="$emit('select', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { MediaType, TitleSummary } from "@cinima/shared";
import KindTabs from "@/components/KindTabs.vue";
import PosterSlider from "@/components/PosterSlider.vue";

const props = defineProps<{
  favorites: TitleSummary[];
  recommends: TitleSummary[];
}>();

defineEmits<{
  select: [title: TitleSummary];
}>();

const mediaKind = ref<MediaType>("movie");

const movieFavorites = computed(
  () => props.favorites.filter((t) => t.mediaType === "movie")
);
const tvFavorites = computed(() => props.favorites.filter((t) => t.mediaType === "tv"));
const movieRecommends = computed(
  () => props.recommends.filter((t) => t.mediaType === "movie")
);
const tvRecommends = computed(() => props.recommends.filter((t) => t.mediaType === "tv"));

const visibleFavorites = computed<TitleSummary[]>(() =>
  mediaKind.value === "tv" ? tvFavorites.value : movieFavorites.value
);
const visibleRecommends = computed<TitleSummary[]>(() =>
  mediaKind.value === "tv" ? tvRecommends.value : movieRecommends.value
);

watch([tvFavorites, movieFavorites, tvRecommends, movieRecommends], ([tv, movie, tvRec, movieRec]) => {
  const tvCount = tv.length + tvRec.length;
  const movieCount = movie.length + movieRec.length;
  mediaKind.value = tvCount > movieCount ? "tv" : "movie";
});
</script>

<style scoped>
.media-section h2 {
  margin: 0;
  font-size: 1.1rem;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
</style>
