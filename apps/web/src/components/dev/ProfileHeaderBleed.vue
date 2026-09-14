<template>
  <div class="bleed">
    <div class="identity">
      <Identicon :address="walletAddress" :size="48" alt="Identicon" />
      <div class="meta">
        <div class="name-row">
          <h1>{{ handle }}</h1>
          <button
            type="button"
            class="achievements"
            :aria-label="`${achievementCount} Achievements`"
            @click="$emit('open-credits')"
          >
            {{ achievementCount }}
          </button>
        </div>
        <p class="stats">{{ followerCount }} followers · {{ followingCount }} following</p>
      </div>
      <div class="actions">
        <button type="button" class="icon-btn on" aria-label="Update X handle" @click="$emit('open-x')">
          <NqIcon name="logos-twitter-mono" :size="18" />
        </button>
        <button type="button" class="icon-btn" aria-label="Share profile" @click="$emit('open-share')">
          <NqIcon name="link" :size="18" />
        </button>
      </div>
    </div>
    <div class="taste">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";

defineProps<{
  walletAddress: string;
  handle: string;
  xHandle: string;
  followerCount: number;
  followingCount: number;
  achievementCount: number;
}>();

defineEmits<{
  "open-credits": [];
  "open-x": [];
  "open-share": [];
}>();
</script>

<style scoped>
.bleed {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.15rem 0 0.15rem;
}

.identity :deep(.identicon) {
  flex-shrink: 0;
}

.meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
}

.name-row {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  min-width: 0;
}

.meta h1 {
  margin: 0;
  font-size: 1.15rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.achievements {
  flex-shrink: 0;
  margin: 0;
  padding: 0.05rem 0.45rem;
  border: 0;
  border-radius: 999px;
  background: color-mix(in oklch, var(--gold) 18%, transparent);
  color: var(--gold);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.stats {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.icon-btn.on {
  color: var(--text-primary);
}

.icon-btn :deep(.nq-icon) {
  width: 18px;
  height: 18px;
}

.taste {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.taste :deep(.media-section:first-child h2) {
  font-size: 1.05rem;
}
</style>
