<template>
  <section class="chart">
    <header class="intro">
      <h2>Community Recommends</h2>
      <p>Ranked by how many peers Recommended each Title</p>
    </header>

    <div v-if="movies.length" class="board">
      <h3>Movies</h3>
      <ol>
        <li v-for="(row, index) in movies" :key="row.title.id">
          <span class="rank">{{ rank(index) }}</span>
          <RecommendsTabPoster :title="row.title" size="thumb" />
          <div class="copy">
            <p class="title">{{ row.title.title }}</p>
            <p class="meta">
              <span v-if="row.title.year">{{ row.title.year }}</span>
              <span v-if="row.title.year" class="dot">·</span>
              <span class="count">{{ recommendCountLabel(row.recommendCount) }}</span>
            </p>
          </div>
        </li>
      </ol>
    </div>

    <div v-if="tv.length" class="board">
      <h3>TV</h3>
      <ol>
        <li v-for="(row, index) in tv" :key="row.title.id">
          <span class="rank">{{ rank(index) }}</span>
          <RecommendsTabPoster :title="row.title" size="thumb" />
          <div class="copy">
            <p class="title">{{ row.title.title }}</p>
            <p class="meta">
              <span v-if="row.title.year">{{ row.title.year }}</span>
              <span v-if="row.title.year" class="dot">·</span>
              <span class="count">{{ recommendCountLabel(row.recommendCount) }}</span>
            </p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import RecommendsTabPoster from "@/components/dev/RecommendsTabPoster.vue";
import {
  rankedCommunityRecommends,
  recommendCountLabel,
  type RecommendsTabLabFixture,
} from "@/lib/recommendsTabLab";

const props = defineProps<{
  fixture: RecommendsTabLabFixture;
}>();

const movies = computed(() => rankedCommunityRecommends(props.fixture.movies));
const tv = computed(() => rankedCommunityRecommends(props.fixture.tv));

function rank(index: number): string {
  return String(index + 1).padStart(2, "0");
}
</script>

<style scoped>
.chart {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  padding-inline: var(--column-pad);
}

.intro h2 {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 800;
}

.intro p {
  margin: 0.28rem 0 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.board {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.board h3 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

li {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.4rem 0.55rem 0.4rem 0.4rem;
  border-radius: 12px;
  background: var(--bg-surface);
}

.rank {
  flex: 0 0 1.7rem;
  font-size: 0.95rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--gold);
  text-align: center;
}

.copy {
  min-width: 0;
  flex: 1;
}

.title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.dot {
  margin: 0 0.28rem;
}

.count {
  color: var(--gold);
}
</style>
