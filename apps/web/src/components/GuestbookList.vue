<template>
  <section v-if="items.length" class="received">
    <div v-if="showHeading || canOpenAll" class="received-head">
      <h2 v-if="showHeading">{{ heading }}</h2>
      <RouterLink v-if="canOpenAll" class="see-all" :to="{ name: 'guestbook' }">
        See all
      </RouterLink>
    </div>
    <ul class="received-list">
      <li
        v-for="item in items"
        :key="`${item.kind}-${item.id}`"
        class="received-event"
      >
        <RouterLink
          v-if="item.kind !== 'join'"
          class="received-who"
          :to="{ name: 'user', params: { wallet: item.fromWallet } }"
          :aria-label="displayName(item.fromHandle, item.fromWallet)"
        >
          <Identicon :address="item.fromWallet" :size="32" alt="" />
        </RouterLink>
        <div class="received-body">
          <p v-if="item.kind === 'guestbook'" class="received-title">{{ item.sendMemo }}</p>
          <p v-else-if="item.kind === 'join'" class="received-title">{{ receivedHow(item.kind) }}</p>
          <template v-else>
            <RouterLink
              class="received-title"
              :to="{ name: 'title', params: { id: item.titleId } }"
            >
              {{ item.titleName }}
            </RouterLink>
            <p class="received-how">{{ receivedHow(item.kind) }}</p>
            <button
              v-if="item.sendMemo"
              type="button"
              class="received-memo"
              :class="{ 'is-open': isMemoOpen(item) }"
              :aria-expanded="isMemoOpen(item)"
              @click="toggleMemo(item)"
            >
              {{ item.sendMemo }}
            </button>
          </template>
        </div>
        <span v-if="nimWatchParts(item).length" class="received-nim">
          <template v-for="(part, i) in nimWatchParts(item)" :key="i">
            <a
              v-if="part.href"
              class="received-nim-link"
              :href="part.href"
              target="_blank"
              rel="noopener noreferrer"
            >{{ part.label }}</a>
            <span v-else>{{ part.label }}</span>
          </template>
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import {
  RECEIVED_LIST_HEADING,
  displayName,
  receivedHow,
  receivedNimWatchParts,
  type ReceivedItem,
} from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";

withDefaults(
  defineProps<{
    items: ReceivedItem[];
    canOpenAll?: boolean;
    showHeading?: boolean;
  }>(),
  { canOpenAll: false, showHeading: true }
);

const heading = RECEIVED_LIST_HEADING;
const openMemos = ref(new Set<string>());

function memoKey(item: ReceivedItem) {
  return `${item.kind}-${item.id}`;
}

function isMemoOpen(item: ReceivedItem) {
  return openMemos.value.has(memoKey(item));
}

function toggleMemo(item: ReceivedItem) {
  const key = memoKey(item);
  const next = new Set(openMemos.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  openMemos.value = next;
}

function nimWatchParts(item: ReceivedItem) {
  return receivedNimWatchParts({
    rewardNim: item.rewardNim,
    sendNim: item.sendNim,
    rewardTxHash: item.kind === "title" || item.kind === "comment" ? item.rewardTxHash : null,
    sendTxHash: item.sendTxHash,
  });
}
</script>

<style scoped>
.received {
  padding: 0 1rem;
}

.received-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0 0 0.65rem;
}

.received-head h2 {
  margin: 0;
  font-size: 1.1rem;
}

.see-all {
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-decoration: none;
}

.see-all:hover,
.see-all:focus-visible {
  color: var(--text-primary);
}

.received-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.received-event {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.45rem 0.65rem;
  line-height: 1.25;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 0.6rem;
}

.received-event :deep(.identicon) {
  flex-shrink: 0;
}

.received-who {
  display: flex;
  flex-shrink: 0;
  border-radius: 50%;
  line-height: 0;
  color: inherit;
  text-decoration: none;
}

.received-who:hover {
  text-decoration: none;
}

.received-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.received-title {
  margin: 0;
  font-weight: 650;
  font-size: 0.88rem;
  line-height: 1.25;
  color: var(--text-primary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.received-how {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.3;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.received-memo {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.78rem;
  line-height: 1.3;
  text-align: left;
  cursor: pointer;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
}

.received-memo.is-open {
  display: block;
  -webkit-line-clamp: unset;
  line-clamp: unset;
  overflow: visible;
  white-space: normal;
}

.received-nim {
  flex-shrink: 0;
  align-self: center;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.12rem;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--gold, #e5c158);
  white-space: nowrap;
}

.received-nim-link {
  color: inherit;
  font: inherit;
  font-weight: inherit;
  text-decoration: none;
}

.received-nim-link:hover,
.received-nim-link:focus-visible {
  text-decoration: underline;
}
</style>
