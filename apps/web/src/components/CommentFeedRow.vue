<template>
  <article class="feed-row">
    <div class="feed-row-top" :class="{ 'is-author-hidden': hideAuthor }">
      <button
        v-if="!hideAuthor"
        type="button"
        class="feed-row-user"
        @click="$emit('open-user', item.walletAddress)"
      >
        <Identicon :address="item.walletAddress" :size="22" alt="" />
        <span>{{ displayName(item.handle, item.walletAddress) }}</span>
      </button>
      <span class="feed-row-time">{{ relativeTime(item.createdAt) }}</span>
    </div>
    <ExpandableText :text="item.body" :lines="2" />
    <CommentThanksActions
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
import CommentThanksActions from "@/components/CommentThanksActions.vue";
import ExpandableText from "@/components/ExpandableText.vue";
import Identicon from "@/components/Identicon.vue";
import { relativeTime } from "@/lib/relativeTime";

defineProps<{
  item: CommentFeedItem;
  own: boolean;
  thankBusy: boolean;
  hideAuthor?: boolean;
}>();

defineEmits<{
  "open-user": [wallet: string];
  thank: [];
  send: [];
}>();
</script>

<style scoped>
.feed-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.7rem 0.85rem;
  border-top: 1px solid var(--border);
}

.feed-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.feed-row-top.is-author-hidden {
  justify-content: flex-end;
}

.feed-row-user {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
}

.feed-row-user span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-row-time {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.feed-row :deep(.expandable-text) {
  font-size: 0.9rem;
  line-height: 1.4;
}
</style>
