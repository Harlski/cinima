<template>
  <div class="find-modal" role="presentation" @click.self="$emit('close')">
    <div
      class="find-dialog nq-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="find-people-title"
    >
      <button type="button" class="find-close" aria-label="Close" @click="$emit('close')">
        <NqIcon name="cross" :size="20" />
      </button>

      <h2 id="find-people-title">Find people</h2>
      <p class="hint">Follow Handles whose taste you want on Following.</p>

      <div v-if="loading" class="state">
        <NqSpinner />
      </div>
      <div v-else-if="people.length === 0" class="state muted">
        No other Handles on the platform yet.
      </div>
      <ul v-else class="people-list">
        <li v-for="person in people" :key="person.walletAddress" class="person-row">
          <button
            type="button"
            class="person-main"
            @click="$emit('open-profile', person.walletAddress)"
          >
            <Identicon :address="person.walletAddress" :size="44" alt="" />
            <div class="person-meta">
              <strong>{{ displayName(person.handle, person.walletAddress) }}</strong>
              <span>
                {{ person.movieFavoriteCount }} movies · {{ person.tvFavoriteCount }} TV ·
                {{ person.thanksReceived }} Thanks received
              </span>
            </div>
          </button>
          <button
            type="button"
            class="follow-btn"
            :class="person.isFollowing ? 'nq-pill-secondary' : 'nq-pill-blue'"
            :disabled="busyWallet === person.walletAddress"
            @click="$emit('toggle-follow', person)"
          >
            {{ person.isFollowing ? "Following" : "Follow" }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { displayName } from "@cinima/shared";
import type { FindPeopleEntry } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";
import NqSpinner from "@/components/NqSpinner.vue";

defineProps<{
  people: FindPeopleEntry[];
  loading: boolean;
  busyWallet: string | null;
}>();

defineEmits<{
  close: [];
  "open-profile": [wallet: string];
  "toggle-follow": [person: FindPeopleEntry];
}>();
</script>

<style scoped>
.find-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.find-dialog {
  position: relative;
  width: min(100%, 26rem);
  max-height: min(78vh, 36rem);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem 1.15rem 1.1rem;
  overflow: hidden;
}

.find-close {
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

.find-dialog h2 {
  margin: 0 1.75rem 0 0;
  font-size: 1.2rem;
}

.hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
}

.state {
  display: grid;
  place-items: center;
  min-height: 8rem;
}

.state.muted {
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: center;
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

.person-meta span {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

.follow-btn {
  flex-shrink: 0;
  min-width: 5.6rem;
  padding-inline: 0.75rem;
  font-size: 0.82rem;
}
</style>
