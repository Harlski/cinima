<template>
  <article class="feed-item">
    <button type="button" class="feed-user" @click="$emit('open-user', item.walletAddress)">
      <Identicon :address="item.walletAddress" :size="36" alt="" />
      <div class="feed-user-text">
        <strong>{{ displayName(item.handle, item.walletAddress) }}</strong>
        <span>{{ relativeTime(item.createdAt) }}</span>
      </div>
    </button>

    <button type="button" class="feed-title" @click="$emit('open-title', item.title.id)">
      <div class="feed-thumb poster-press">
        <PosterImg
          v-if="item.title.posterUrl"
          :src="item.title.posterUrl"
          :alt="item.title.title"
          :spinner-size="22"
        />
        <div v-else class="poster-fallback">{{ item.title.title }}</div>
      </div>
      <div class="feed-title-meta">
        <strong>{{ item.title.title }}</strong>
        <span>{{ item.title.year }} · {{ item.title.mediaType }}</span>
      </div>
    </button>

    <ExpandableText :text="item.body" :lines="3" />

    <CommentThanksButton
      :own="own"
      :deleted="false"
      :thanked="item.thanked"
      :sent="item.sent"
      :count="item.thanksCount"
      :busy="thankBusy"
      @thank="$emit('thank')"
      @send="$emit('send')"
    />
  </article>
</template>

<script setup lang="ts">
import { displayName, type CommentFeedItem } from "@cinima/shared";
import CommentThanksButton from "@/components/CommentThanksButton.vue";
import ExpandableText from "@/components/ExpandableText.vue";
import Identicon from "@/components/Identicon.vue";
import PosterImg from "@/components/PosterImg.vue";
import { relativeTime } from "@/lib/relativeTime";

defineProps<{
  item: CommentFeedItem;
  own: boolean;
  thankBusy: boolean;
}>();

defineEmits<{
  "open-user": [wallet: string];
  "open-title": [titleId: string];
  thank: [];
  send: [];
}>();
</script>

<style scoped>
.feed-item {
  background: var(--bg-surface);
  border-radius: 14px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.feed-user,
.feed-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: transparent;
  border: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  padding: 0;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
}

.feed-user-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.feed-user-text strong {
  color: var(--text-primary);
  font-size: 0.95rem;
}

.feed-user-text span {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.feed-thumb {
  width: 44px;
  height: 66px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-primary);
  flex-shrink: 0;
}

.feed-thumb img,
.poster-fallback {
  width: 100%;
  height: 100%;
  border-radius: 0;
  object-fit: cover;
  background: var(--bg-primary);
  display: block;
}

.poster-fallback {
  display: grid;
  place-items: center;
  font-size: 0.55rem;
  color: var(--text-secondary);
  padding: 0.25rem;
  text-align: center;
}

.feed-title-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.feed-title-meta strong {
  color: var(--text-primary);
}

.feed-title-meta span {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.feed-item :deep(.expandable-text) {
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0;
}
</style>
