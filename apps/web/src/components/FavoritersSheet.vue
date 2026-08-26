<template>
  <Teleport to="body">
    <div class="favoriters-modal" role="presentation" @click.self="$emit('close')">
      <div
        class="favoriters-dialog nq-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favoriters-title"
      >
        <button type="button" class="favoriters-close" aria-label="Close" @click="$emit('close')">
          <NqIcon name="cross" :size="20" />
        </button>

        <h2 id="favoriters-title">Who marked this</h2>

        <div class="taste-tabs" role="tablist" aria-label="Recommend or Favorite">
          <button
            type="button"
            role="tab"
            class="taste-tab"
            :class="{ active: tab === 'recommends' }"
            :aria-selected="tab === 'recommends'"
            @click="tab = 'recommends'"
          >
            Recommends ({{ recommendCount }})
          </button>
          <button
            type="button"
            role="tab"
            class="taste-tab"
            :class="{ active: tab === 'favorites' }"
            :aria-selected="tab === 'favorites'"
            @click="tab = 'favorites'"
          >
            Favorites ({{ favoriteCount }})
          </button>
        </div>

        <p class="hint">
          {{ visiblePeople.length }}
          {{ visiblePeople.length === 1 ? "Handle" : "Handles" }}
        </p>

        <ul v-if="visiblePeople.length" class="people-list">
          <li v-for="person in visiblePeople" :key="person.walletAddress" class="person-row">
            <button
              type="button"
              class="person-main"
              @click="$emit('open-profile', person.walletAddress)"
            >
              <Identicon :address="person.walletAddress" :size="44" alt="" />
              <div class="person-meta">
                <strong>{{ displayName(person.handle, person.walletAddress) }}</strong>
              </div>
            </button>
            <button
              type="button"
              class="open-btn nq-pill-secondary"
              @click="$emit('open-profile', person.walletAddress)"
            >
              Profile
            </button>
          </li>
        </ul>
        <p v-else class="empty">
          {{ tab === "recommends" ? "No Recommends yet" : "No Favorites yet" }}
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { displayName } from "@cinima/shared";
import type { TitleSuggester } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";

export type TastePeopleTab = "recommends" | "favorites";

const props = withDefaults(
  defineProps<{
    people: TitleSuggester[];
    initialTab?: TastePeopleTab;
    recommendCount?: number;
    favoriteCount?: number;
  }>(),
  {
    initialTab: "recommends",
    recommendCount: 0,
    favoriteCount: 0,
  }
);

defineEmits<{
  close: [];
  "open-profile": [wallet: string];
}>();

const tab = ref<TastePeopleTab>(props.initialTab ?? "recommends");

watch(
  () => props.initialTab,
  (next) => {
    if (next) tab.value = next;
  }
);

const recommendPeople = computed(() => props.people.filter((p) => p.recommended));
const favoritePeople = computed(() => props.people.filter((p) => !p.recommended));
const visiblePeople = computed(() =>
  tab.value === "recommends" ? recommendPeople.value : favoritePeople.value
);
</script>

<style scoped>
.favoriters-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding:
    calc(var(--vv-offset-top, 0px) + var(--app-brand-row, 2.75rem) + 0.75rem)
    1.25rem
    calc(var(--bottom-tabs-inset, 5.5rem) + 0.75rem);
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
  box-sizing: border-box;
}

.favoriters-dialog {
  position: relative;
  width: min(100%, 26rem);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem 1.15rem 1.1rem;
  overflow: hidden;
}

.favoriters-close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.favoriters-dialog h2 {
  margin: 0 1.75rem 0 0;
  font-size: 1.2rem;
}

.taste-tabs {
  display: flex;
  padding: 0.15rem;
  background: var(--bg-surface);
  border-radius: 999px;
}

.taste-tab {
  flex: 1;
  padding: 0.35rem 0.55rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.taste-tab.active {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
}

.empty {
  margin: 0.5rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.people-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
}

.person-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.person-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.35rem 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.person-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.person-meta strong {
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.open-btn {
  flex-shrink: 0;
  min-width: 5.6rem;
  padding-inline: 0.75rem;
  font-size: 0.82rem;
}
</style>
