<template>
  <div class="cover">
    <div class="wash" aria-hidden="true">
      <img
        v-for="title in wash"
        :key="title.id"
        :src="title.posterUrl || ''"
        alt=""
      />
      <div class="wash-veil" />
    </div>
    <div class="identity">
      <Identicon :address="walletAddress" :size="80" alt="Identicon" />
      <h1>{{ handle }}</h1>
      <p class="stats">{{ followerCount }} followers · {{ followingCount }} following</p>
      <div class="actions">
        <button type="button" class="nq-pill-gold action" @click="$emit('open-share')">
          <NqIcon name="link" :size="16" />
          Share
        </button>
        <button type="button" class="nq-pill-secondary action" @click="$emit('open-x')">
          <NqIcon name="logos-twitter-mono" :size="16" />
          @{{ xHandle }}
        </button>
      </div>
      <button type="button" class="achievements" @click="$emit('open-credits')">
        {{ achievementCount }} Achievements
      </button>
    </div>
    <div class="taste">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TitleSummary } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";

const props = defineProps<{
  walletAddress: string;
  handle: string;
  xHandle: string;
  followerCount: number;
  followingCount: number;
  achievementCount: number;
  washTitles: TitleSummary[];
}>();

defineEmits<{
  "open-credits": [];
  "open-x": [];
  "open-share": [];
}>();

const wash = computed(() => props.washTitles.filter((t) => t.posterUrl));
</script>

<style scoped>
.cover {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-inline: calc(var(--column-pad) * -1);
  margin-top: -1rem;
}

.wash {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: 9.25rem;
  overflow: hidden;
}

.wash img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.wash-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in oklch, var(--bg-primary) 12%, transparent) 0%,
    color-mix(in oklch, var(--bg-primary) 35%, transparent) 42%,
    var(--bg-primary) 100%
  );
}

.identity {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.28rem;
  margin-top: -3.1rem;
  padding: 0 var(--column-pad) 1.15rem;
}

.identity :deep(.identicon) {
  box-shadow: 0 0 0 3px var(--bg-primary);
  margin-bottom: 0.35rem;
}

.identity h1 {
  margin: 0;
  font-size: 1.4rem;
}

.stats {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.45rem;
  margin-top: 0.45rem;
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

.achievements {
  margin: 0.2rem 0 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--gold);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 650;
  cursor: pointer;
}

.taste {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-inline: var(--column-pad);
}
</style>
