<template>
  <section class="media-section">
    <div class="section-heading">
      <h2>Recommends</h2>
      <KindTabs v-model="recommendKind" aria-label="Recommend media type" />
    </div>
    <PosterSlider
      :titles="visibleRecommends"
      gold="always"
      fit
      :max-rows="2"
      :empty="recommendKind === 'tv' ? 'No TV Recommends yet' : 'No movie Recommends yet'"
      @select="$emit('select', $event)"
    />
  </section>

  <section class="media-section">
    <div class="section-heading">
      <h2>Favorites</h2>
      <KindTabs v-model="favoriteKind" aria-label="Favorite media type" />
    </div>
    <PosterSlider
      :titles="visibleFavorites"
      gold="recommended"
      :max-rows="2"
      :empty="favoriteKind === 'tv' ? 'No TV shows yet' : 'No movies yet'"
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

const recommendKind = ref<MediaType>("movie");
const favoriteKind = ref<MediaType>("movie");

const movieFavorites = computed(
  () => props.favorites.filter((t) => t.mediaType === "movie")
);
const tvFavorites = computed(() => props.favorites.filter((t) => t.mediaType === "tv"));
const movieRecommends = computed(
  () => props.recommends.filter((t) => t.mediaType === "movie")
);
const tvRecommends = computed(() => props.recommends.filter((t) => t.mediaType === "tv"));

const visibleFavorites = computed<TitleSummary[]>(() =>
  favoriteKind.value === "tv" ? tvFavorites.value : movieFavorites.value
);
const visibleRecommends = computed<TitleSummary[]>(() =>
  recommendKind.value === "tv" ? tvRecommends.value : movieRecommends.value
);

watch([tvRecommends, movieRecommends], ([tv, movie]) => {
  recommendKind.value = tv.length > movie.length ? "tv" : "movie";
});

watch([tvFavorites, movieFavorites], ([tv, movie]) => {
  favoriteKind.value = tv.length > movie.length ? "tv" : "movie";
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
