<template>
  <div class="strip">
    <div class="identity">
      <Identicon :address="walletAddress" :size="56" alt="Identicon" />
      <h1>{{ handle }}</h1>
      <div class="actions">
        <button type="button" class="icon-btn on" aria-label="Update X handle" @click="$emit('open-x')">
          <NqIcon name="logos-twitter-mono" :size="18" />
        </button>
        <button type="button" class="icon-btn" aria-label="Share profile" @click="$emit('open-share')">
          <NqIcon name="link" :size="18" />
        </button>
      </div>
    </div>
    <div class="band">
      <p class="cell">
        <strong>{{ followerCount }}</strong>
        <span>followers</span>
      </p>
      <p class="cell">
        <strong>{{ followingCount }}</strong>
        <span>following</span>
      </p>
      <button type="button" class="cell cell--btn" @click="$emit('open-credits')">
        <strong>{{ achievementCount }}</strong>
        <span>Achievements</span>
      </button>
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
.strip {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-inline: calc(var(--column-pad) * -1);
}

.identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem var(--column-pad) 0.75rem;
}

.identity :deep(.identicon) {
  flex-shrink: 0;
}

.identity h1 {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 1.22rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--colors-neutral-200);
  color: var(--text-primary);
  cursor: pointer;
}

.icon-btn :deep(.nq-icon) {
  width: 18px;
  height: 18px;
}

.band {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  background: var(--bg-surface);
  border-block: 1px solid var(--border);
  margin-bottom: 1rem;
}

.cell {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.08rem;
  padding: 0.7rem 0.35rem;
  font: inherit;
  color: var(--text-secondary);
}

.cell strong {
  font-size: 1.05rem;
  font-weight: 750;
  color: var(--text-primary);
  line-height: 1.15;
}

.cell span {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.cell--btn {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.cell--btn strong,
.cell--btn span {
  color: var(--gold);
}

.taste {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-inline: var(--column-pad);
}
</style>
