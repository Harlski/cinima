<template>
  <section class="billboard">
    <div class="hero">
      <RecommendsTabPoster :title="featured.title" size="hero" :gold="false" />
      <div class="veil" />
      <div class="copy">
        <p class="eyebrow">Most Recommended</p>
        <h2>{{ featured.title.title }}</h2>
        <p class="meta">
          <span v-if="featured.title.year">{{ featured.title.year }}</span>
          <span v-if="featured.title.year" class="dot">·</span>
          <span>{{ mediaLabel(featured.title.mediaType) }}</span>
          <span class="dot">·</span>
          <span class="count">{{ recommendCountLabel(featured.recommendCount) }}</span>
        </p>
      </div>
    </div>

    <div v-if="movies.length" class="rail">
      <h3>Movies</h3>
      <div class="rail-scroll" role="list">
        <div
          v-for="row in movies"
          :key="row.title.id"
          class="rail-item"
          role="listitem"
          :aria-label="row.title.title"
        >
          <RecommendsTabPoster :title="row.title" size="rail" />
        </div>
      </div>
    </div>

    <div v-if="tv.length" class="rail">
      <h3>TV</h3>
      <div class="rail-scroll" role="list">
        <div
          v-for="row in tv"
          :key="row.title.id"
          class="rail-item"
          role="listitem"
          :aria-label="row.title.title"
        >
          <RecommendsTabPoster :title="row.title" size="rail" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { MediaType } from "@cinima/shared";
import RecommendsTabPoster from "@/components/dev/RecommendsTabPoster.vue";
import {
  featuredCommunityRecommend,
  recommendCountLabel,
  type RecommendsTabLabFixture,
} from "@/lib/recommendsTabLab";

const props = defineProps<{
  fixture: RecommendsTabLabFixture;
}>();

const featured = computed(() => featuredCommunityRecommend(props.fixture));
const movies = computed(() =>
  props.fixture.movies.filter((row) => row.title.id !== featured.value.title.id)
);
const tv = computed(() =>
  props.fixture.tv.filter((row) => row.title.id !== featured.value.title.id)
);

function mediaLabel(kind: MediaType): string {
  return kind === "tv" ? "TV" : "Movie";
}
</script>

<style scoped>
.billboard {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  margin-inline: calc(var(--column-pad) * -1);
  margin-top: -0.35rem;
}

.hero {
  position: relative;
  height: 22.5rem;
  overflow: hidden;
  color: var(--text-primary);
}

.veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    var(--bg-primary) 0%,
    color-mix(in oklch, var(--bg-primary) 88%, transparent) 28%,
    color-mix(in oklch, var(--bg-primary) 42%, transparent) 58%,
    color-mix(in oklch, var(--bg-primary) 8%, transparent) 78%,
    transparent 100%
  );
  pointer-events: none;
}

.copy {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  padding: 3.25rem var(--column-pad) 1.15rem;
  background: linear-gradient(
    to top,
    var(--bg-primary) 0%,
    color-mix(in oklch, var(--bg-primary) 88%, transparent) 58%,
    transparent 100%
  );
}

.eyebrow {
  margin: 0 0 0.28rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
}

.copy h2 {
  margin: 0;
  font-size: 1.85rem;
  line-height: 1.05;
  font-weight: 800;
  text-wrap: balance;
  text-shadow: 0 2px 18px color-mix(in oklch, var(--colors-neutral) 70%, transparent);
}

.meta {
  margin: 0.4rem 0 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: color-mix(in oklch, var(--colors-neutral-0) 82%, transparent);
}

.dot {
  margin: 0 0.28rem;
}

.count {
  color: var(--gold);
}

.rail {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rail h3 {
  margin: 0;
  padding-inline: var(--column-pad);
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.rail-scroll {
  display: flex;
  gap: 0.65rem;
  overflow-x: auto;
  padding-inline: var(--column-pad);
  padding-bottom: 0.35rem;
  scrollbar-width: thin;
}

.rail-item {
  flex: 0 0 auto;
}
</style>
