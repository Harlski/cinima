<template>
  <section class="peers">
    <header class="intro">
      <div>
        <h2>Who recommended</h2>
        <p>Titles other Handles have Recommended</p>
      </div>
      <KindTabs v-model="kind" aria-label="Recommend media type" />
    </header>

    <article v-for="row in rows" :key="row.title.id" class="card">
      <RecommendsTabPoster :title="row.title" size="thumb" />
      <div class="body">
        <p class="title">{{ row.title.title }}</p>
        <p class="meta">
          <span v-if="row.title.year">{{ row.title.year }}</span>
          <span v-if="row.title.year" class="dot">·</span>
          <span>{{ mediaLabel(row.title.mediaType) }}</span>
        </p>
        <p class="who">{{ whoLine(row.recommenders) }}</p>
        <div class="faces">
          <Identicon
            v-for="peer in row.faces.shown"
            :key="peer.walletAddress"
            :address="peer.walletAddress"
            :size="28"
            :alt="peer.handle"
          />
          <span v-if="row.faces.extra" class="extra">
            +{{ row.faces.extra }}
          </span>
        </div>
      </div>
      <p class="count">{{ recommendCountLabel(row.recommendCount) }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { MediaType } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import KindTabs from "@/components/KindTabs.vue";
import RecommendsTabPoster from "@/components/dev/RecommendsTabPoster.vue";
import {
  rankedCommunityRecommends,
  recommendCountLabel,
  visibleRecommenders,
  type RecommendsTabLabFixture,
  type RecommendsTabLabPeer,
} from "@/lib/recommendsTabLab";

const props = defineProps<{
  fixture: RecommendsTabLabFixture;
}>();

const kind = ref<MediaType>("movie");
const rows = computed(() =>
  rankedCommunityRecommends(kind.value === "tv" ? props.fixture.tv : props.fixture.movies).map(
    (row) => ({
      ...row,
      faces: visibleRecommenders(row.recommenders, 4),
    })
  )
);

function mediaLabel(mediaType: MediaType): string {
  return mediaType === "tv" ? "TV" : "Movie";
}

function whoLine(recommenders: readonly RecommendsTabLabPeer[]): string {
  const first = recommenders[0]?.handle;
  if (!first) return "";
  if (recommenders.length === 1) return first;
  if (recommenders.length === 2) return `${first} and ${recommenders[1]?.handle}`;
  return `${first} and ${recommenders.length - 1} others`;
}
</script>

<style scoped>
.peers {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding-inline: var(--column-pad);
}

.intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.intro h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
}

.intro p {
  margin: 0.22rem 0 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem;
  border-radius: 14px;
  background: var(--bg-surface);
}

.body {
  min-width: 0;
  flex: 1;
}

.title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 750;
  line-height: 1.2;
}

.meta,
.who {
  margin: 0.18rem 0 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.who {
  color: var(--text-primary);
}

.dot {
  margin: 0 0.28rem;
}

.faces {
  display: flex;
  align-items: center;
  margin-top: 0.45rem;
}

.faces :deep(.identicon) {
  box-shadow: 0 0 0 2px var(--bg-surface);
}

.faces :deep(.identicon + .identicon),
.faces :deep(.identicon + .extra),
.faces .extra {
  margin-left: -0.45rem;
}

.extra {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: color-mix(in oklch, var(--gold) 22%, var(--bg-primary));
  color: var(--gold);
  font-size: 0.62rem;
  font-weight: 800;
  box-shadow: 0 0 0 2px var(--bg-surface);
}

.count {
  margin: 0;
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.01em;
  color: var(--gold);
  text-align: right;
  white-space: nowrap;
  line-height: 1.2;
}
</style>
