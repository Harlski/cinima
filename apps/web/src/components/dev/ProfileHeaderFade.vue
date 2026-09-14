<template>
  <div class="fade">
    <div class="identity">
      <Identicon :address="walletAddress" :size="76" alt="Identicon" />
      <h1>{{ handle }}</h1>
      <p class="stats">{{ followerCount }} followers · {{ followingCount }} following</p>
      <button type="button" class="achievements" @click="$emit('open-credits')">
        {{ achievementCount }} Achievements
      </button>
      <div class="actions">
        <button type="button" class="nq-pill-secondary action" @click="$emit('open-x')">
          <NqIcon name="logos-twitter-mono" :size="16" />
          @{{ xHandle }}
        </button>
        <button type="button" class="nq-pill-blue action" @click="$emit('open-share')">
          <NqIcon name="link" :size="16" />
          Share
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
.fade {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-inline: calc(var(--column-pad) * -1);
  padding-inline: var(--column-pad);
  background: linear-gradient(
    to bottom,
    color-mix(in oklch, var(--bg-surface) 94%, transparent) 0%,
    color-mix(in oklch, var(--bg-surface) 62%, transparent) 9rem,
    color-mix(in oklch, var(--bg-surface) 22%, transparent) 14.5rem,
    transparent 18.5rem
  );
  border-bottom: 0;
}

.identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.28rem;
  padding: 1.35rem 0.5rem 1.6rem;
}

.identity :deep(.identicon) {
  margin-bottom: 0.45rem;
}

.identity h1 {
  margin: 0;
  font-size: 1.45rem;
}

.stats {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.achievements {
  margin: 0.1rem 0 0.45rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--gold);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 650;
  cursor: pointer;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.action :deep(.nq-icon) {
  width: 16px;
  height: 16px;
}

.taste {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-bottom: 0.25rem;
}
</style>
