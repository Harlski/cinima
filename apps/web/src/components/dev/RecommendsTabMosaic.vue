<template>
  <CommunityRecommendsMosaic :movies="movies" :tv="tv" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import CommunityRecommendsMosaic from "@/components/CommunityRecommendsMosaic.vue";
import type { RecommendsTabLabFixture } from "@/lib/recommendsTabLab";

const props = defineProps<{
  fixture: RecommendsTabLabFixture;
}>();

const movies = computed(() =>
  props.fixture.movies.map((row) => ({
    ...row.title,
    recommendCount: row.recommendCount,
  }))
);
const tv = computed(() =>
  props.fixture.tv.map((row) => ({
    ...row.title,
    recommendCount: row.recommendCount,
  }))
);
</script>
