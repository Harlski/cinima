<template>
  <div class="player-card nq-card">
    <Identicon :address="walletAddress" :size="avatarSize" alt="Identicon" />
    <div class="player-meta">
      <h1>{{ handle }}</h1>
      <button
        v-if="walletDisplay === 'copy'"
        type="button"
        class="wallet wallet--copy"
        :title="copied ? 'Copied' : 'Copy wallet address'"
        @click="copyWallet"
      >
        {{ formatWallet(walletAddress) }}
      </button>
      <p v-else class="wallet">{{ abbreviateWallet(walletAddress) }}</p>
      <p v-if="statsLine" class="stats">{{ statsLine }}</p>
      <a
        v-if="showXLink && xUrl"
        class="x-link"
        :href="xUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`${handle} on X`"
      >
        <NqIcon name="logos-twitter-mono" :size="18" />
        <span>@{{ xHandle }}</span>
      </a>
    </div>
    <div v-if="$slots.actions" class="player-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { abbreviateWallet, formatWallet, normalizeWallet, xProfileUrl } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";

const props = withDefaults(
  defineProps<{
    walletAddress: string;
    handle: string;
    xHandle?: string | null;
    showXLink?: boolean;
    followerCount?: number;
    followingCount?: number;
    walletDisplay?: "copy" | "abbrev";
    avatarSize?: number;
  }>(),
  {
    xHandle: null,
    showXLink: true,
    walletDisplay: "abbrev",
    avatarSize: 72,
  }
);

const copied = ref(false);

const xUrl = computed(() => xProfileUrl(props.xHandle));

const statsLine = computed(() => {
  if (props.followerCount == null || props.followingCount == null) return null;
  return `${props.followerCount} followers · ${props.followingCount} following`;
});

const copyWallet = async () => {
  try {
    await navigator.clipboard.writeText(normalizeWallet(props.walletAddress));
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    copied.value = false;
  }
};
</script>

<style scoped>
.player-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.15rem;
  padding: 1.35rem 1.5rem;
  text-align: left;
}

.player-card :deep(.identicon) {
  flex-shrink: 0;
}

.player-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-meta h1 {
  margin: 0;
  font-size: 1.35rem;
}

.wallet {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.45;
}

.wallet--copy {
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.stats {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.x-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.2rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}

.x-link:hover {
  color: var(--text-primary);
  text-decoration: none;
}

.player-actions {
  flex-shrink: 0;
  align-self: center;
}
</style>
