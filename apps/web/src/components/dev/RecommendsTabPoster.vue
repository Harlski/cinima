<template>
  <div class="poster" :class="`poster--${size}`">
    <RecommendBadge v-if="gold" :size="badgeSize" :count="recommendCount" />
    <PosterImg v-if="title.posterUrl" :src="title.posterUrl" :alt="title.title" />
    <div v-else class="fallback">{{ title.title }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TitleSummary } from "@cinima/shared";
import PosterImg from "@/components/PosterImg.vue";
import RecommendBadge from "@/components/RecommendBadge.vue";

const props = withDefaults(
  defineProps<{
    title: TitleSummary;
    size?: "hero" | "rail" | "mosaic" | "thumb";
    gold?: boolean;
    recommendCount?: number;
  }>(),
  {
    size: "rail",
    gold: true,
    recommendCount: undefined,
  }
);

const badgeSize = computed(() => {
  if (props.size === "hero") return 36;
  if (props.size === "mosaic") return 32;
  if (props.size === "thumb") return 18;
  return 22;
});
</script>

<style scoped>
.poster {
  position: relative;
  overflow: hidden;
  background: var(--bg-surface);
  border-radius: 10px;
}

.poster--hero {
  border-radius: 0;
  width: 100%;
  height: 100%;
}

.poster--rail {
  width: 5.85rem;
  aspect-ratio: 2 / 3;
  flex: 0 0 5.85rem;
}

.poster--mosaic {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: visible;
}

.poster--mosaic :deep(.poster-img) {
  overflow: hidden;
  border-radius: 12px;
}

.poster--thumb {
  width: 3.35rem;
  aspect-ratio: 2 / 3;
  flex: 0 0 3.35rem;
  border-radius: 8px;
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

.poster--hero :deep(.poster-img img) {
  object-position: center 42%;
}

.fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.4rem;
  text-align: center;
  font-size: 0.72rem;
  color: var(--text-secondary);
}
</style>
