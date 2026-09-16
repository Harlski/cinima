<template>
  <div class="group-list">
    <section v-for="group in groups" :key="group.title.id" class="group-card">
      <button
        type="button"
        class="group-head"
        @click="$emit('open-title', group.title.id)"
      >
        <div class="group-poster poster-press">
          <PosterImg
            v-if="group.title.posterUrl"
            :src="group.title.posterUrl"
            :alt="group.title.title"
            :spinner-size="22"
          />
          <div v-else class="poster-fallback">{{ group.title.title }}</div>
        </div>
        <div class="group-meta">
          <strong>{{ group.title.title }}</strong>
          <span>
            <template v-if="group.title.year">{{ group.title.year }} · </template>
            {{ group.title.mediaType }}
            · {{ group.comments.length }}
            {{ group.comments.length === 1 ? "comment" : "comments" }}
          </span>
        </div>
      </button>

      <CommentFeedRow
        v-for="item in group.comments"
        :key="item.id"
        :item="item"
        :own="item.walletAddress === ownWallet"
        :thank-busy="thankBusyId === item.id"
        :hide-author="hideAuthor"
        @open-user="$emit('open-user', $event)"
        @thank="$emit('thank', item)"
        @send="$emit('send', item)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CommentFeedItem } from "@cinima/shared";
import CommentFeedRow from "@/components/CommentFeedRow.vue";
import PosterImg from "@/components/PosterImg.vue";
import { groupCommentFeed } from "@/lib/commentFeedGroups";

const props = defineProps<{
  items: CommentFeedItem[];
  ownWallet: string | null;
  thankBusyId: number | null;
  hideAuthor?: boolean;
}>();

defineEmits<{
  "open-user": [wallet: string];
  "open-title": [titleId: string];
  thank: [item: CommentFeedItem];
  send: [item: CommentFeedItem];
}>();

const groups = computed(() => groupCommentFeed(props.items));
</script>

<style scoped>
.group-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.group-card {
  background: var(--bg-surface);
  border-radius: 14px;
  overflow: hidden;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  border: 0;
  background: color-mix(in oklch, var(--bg-surface) 55%, var(--bg-primary));
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.group-poster {
  width: 40px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-primary);
  flex-shrink: 0;
}

.group-poster img,
.poster-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-fallback {
  display: grid;
  place-items: center;
  font-size: 0.5rem;
  color: var(--text-secondary);
  padding: 0.2rem;
  text-align: center;
}

.group-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.group-meta strong {
  color: var(--text-primary);
  font-size: 0.95rem;
}

.group-meta span {
  color: var(--text-secondary);
  font-size: 0.78rem;
}
</style>
