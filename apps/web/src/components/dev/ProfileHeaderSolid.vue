<template>
  <div class="solid">
    <div class="player-card nq-card">
      <Identicon :address="walletAddress" :size="56" alt="Identicon" />
      <div class="meta">
        <h1>{{ handle }}</h1>
        <p class="stats">{{ followerCount }} followers</p>
        <p class="stats">{{ followingCount }} following</p>
        <button type="button" class="achievements" @click="$emit('open-credits')">
          {{ achievementCount }} Achievements
        </button>
      </div>
      <div class="actions">
        <button type="button" class="icon-btn on" aria-label="Update X handle" @click="$emit('open-x')">
          <NqIcon name="logos-twitter-mono" :size="20" />
        </button>
        <button type="button" class="icon-btn" aria-label="Share profile" @click="$emit('open-share')">
          <NqIcon name="link" :size="20" />
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
.solid {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.player-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  padding: 1.15rem 1.2rem;
  text-align: left;
}

.player-card :deep(.identicon) {
  flex-shrink: 0;
}

.meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.meta h1 {
  margin: 0;
  font-size: 1.28rem;
}

.stats {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.achievements {
  margin: 0;
  padding: 0;
  width: fit-content;
  border: 0;
  background: transparent;
  color: var(--gold);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--colors-neutral-200);
  color: var(--text-primary);
  cursor: pointer;
}

.icon-btn :deep(.nq-icon) {
  width: 20px;
  height: 20px;
}

.taste {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
</style>
