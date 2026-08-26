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

        <h2 id="favoriters-title">Favorited this</h2>
        <p class="hint">{{ people.length }} {{ people.length === 1 ? "Handle" : "Handles" }}</p>

        <ul class="people-list">
          <li v-for="person in people" :key="person.walletAddress" class="person-row">
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
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { displayName } from "@cinima/shared";
import type { TitleSuggester } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";

defineProps<{
  people: TitleSuggester[];
}>();

defineEmits<{
  close: [];
  "open-profile": [wallet: string];
}>();
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

.hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
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
