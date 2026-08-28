<template>
  <TourSpotlight :id="TOUR_SPOTLIGHT.userRecommends" radius="12px">
    <section class="media-section" :data-tour="TOUR_SPOTLIGHT.userRecommends">
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
  </TourSpotlight>

  <TourSpotlight :id="TOUR_SPOTLIGHT.userFavorites" radius="12px">
    <section class="media-section" :data-tour="TOUR_SPOTLIGHT.userFavorites">
      <div class="section-heading">
        <h2>Favorites</h2>
        <KindTabs v-model="favoriteKind" aria-label="Favorite media type" />
      </div>
      <PosterSlider
        :titles="visibleFavorites"
        gold="recommended"
        :max-rows="2"
        :empty="favoriteKind === 'tv' ? 'No TV Favorites yet' : 'No movie Favorites yet'"
        @select="$emit('select', $event)"
      />
    </section>
  </TourSpotlight>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { MediaType, TitleSummary } from "@cinima/shared";
import KindTabs from "@/components/KindTabs.vue";
import PosterSlider from "@/components/PosterSlider.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import { TOUR_SPOTLIGHT } from "@/lib/guidedTour";
import { pickDefaultMediaKind } from "@/lib/mediaKindDefault";
import { favoriteOnlyTitles } from "@/lib/profileTaste";

const props = defineProps<{
  favorites: TitleSummary[];
  recommends: TitleSummary[];
}>();

defineEmits<{
  select: [title: TitleSummary];
}>();

const recommendKind = ref<MediaType>("movie");
const favoriteKind = ref<MediaType>("movie");

const favoriteOnly = computed(() =>
  favoriteOnlyTitles(props.favorites, props.recommends)
);
const movieFavorites = computed(
  () => favoriteOnly.value.filter((t) => t.mediaType === "movie")
);
const tvFavorites = computed(() =>
  favoriteOnly.value.filter((t) => t.mediaType === "tv")
);
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

watch(
  [tvRecommends, movieRecommends],
  ([tv, movie]) => {
    recommendKind.value = pickDefaultMediaKind(movie.length, tv.length);
  },
  { immediate: true }
);

watch(
  [tvFavorites, movieFavorites],
  ([tv, movie]) => {
    favoriteKind.value = pickDefaultMediaKind(movie.length, tv.length);
  },
  { immediate: true }
);</script>

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
