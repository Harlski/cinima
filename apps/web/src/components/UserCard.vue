<template>
  <div class="profile-header" :class="{ 'has-wash': wash.length }">
    <div
      v-if="wash.length"
      class="wash"
      aria-hidden="true"
      :style="{ '--wash-cols': wash.length }"
    >
      <img
        v-for="title in wash"
        :key="title.id"
        :src="title.posterUrl || ''"
        alt=""
      />
      <div class="wash-veil" />
    </div>
    <div class="identity">
      <RouterLink
        v-if="identiconTo"
        class="identicon-link"
        :to="identiconTo"
        :aria-label="identiconLabel"
      >
        <Identicon :address="walletAddress" :size="56" alt="" />
      </RouterLink>
      <Identicon v-else :address="walletAddress" :size="56" alt="Identicon" />
      <div class="meta">
        <div class="name-row">
          <h1>{{ handle }}</h1>
          <button
            v-if="achievementCount != null && achievementOpen"
            type="button"
            class="achievements"
            :aria-label="achievementLine"
            @click="$emit('open-credits')"
          >
            {{ achievementCount }}
          </button>
          <span
            v-else-if="achievementCount != null"
            class="achievements achievements--static"
          >
            {{ achievementCount }}
          </span>
        </div>
        <p v-if="showStats" class="stats">
          <span>{{ followerLabel }}</span>
          <span>{{ followingLabel }}</span>
        </p>
      </div>
      <div v-if="(showXLink && xUrl) || $slots.actions" class="actions">
        <a
          v-if="showXLink && xUrl"
          class="icon-btn"
          :href="xUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`${handle} on X`"
        >
          <NqIcon name="logos-twitter-mono" :size="18" />
        </a>
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { RouterLink } from "vue-router";
import type { TitleSummary } from "@cinima/shared";
import { xProfileUrl } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";
import { pickRecommendWashForProfile } from "@/lib/profileHeader";

const props = withDefaults(
  defineProps<{
    walletAddress: string;
    handle: string;
    xHandle?: string | null;
    showXLink?: boolean;
    recommends?: TitleSummary[];
    followerCount?: number;
    followingCount?: number;
    achievementCount?: number | null;
    achievementOpen?: boolean;
    identiconTo?: RouteLocationRaw | null;
    identiconLabel?: string;
  }>(),
  {
    xHandle: null,
    showXLink: true,
    recommends: () => [],
    achievementCount: null,
    achievementOpen: false,
    identiconTo: null,
    identiconLabel: "View profile",
  }
);

defineEmits<{
  "open-credits": [];
}>();

const xUrl = computed(() => xProfileUrl(props.xHandle));

const wash = computed(() =>
  pickRecommendWashForProfile(props.walletAddress, props.recommends)
);

const showStats = computed(
  () => props.followerCount != null && props.followingCount != null
);

const followerLabel = computed(() => {
  const n = props.followerCount ?? 0;
  return n === 1 ? "1 follower" : `${n} followers`;
});

const followingLabel = computed(() => {
  const n = props.followingCount ?? 0;
  return n === 1 ? "1 following" : `${n} following`;
});

const achievementLine = computed(() => {
  const n = props.achievementCount ?? 0;
  return n === 1 ? "1 Achievement" : `${n} Achievements`;
});
</script>

<style scoped>
.profile-header {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-inline: calc(var(--column-pad) * -1);
}

.profile-header.has-wash {
  margin-top: -1rem;
}

.wash {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--wash-cols, 4), 1fr);
  height: 8.25rem;
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
    color-mix(in oklch, var(--bg-primary) 8%, transparent) 0%,
    color-mix(in oklch, var(--bg-primary) 28%, transparent) 48%,
    var(--bg-primary) 100%
  );
}

.identity {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.15rem var(--column-pad) 0.35rem;
}

.has-wash .identity {
  margin-top: -2rem;
  padding-bottom: 0.75rem;
}

.identity :deep(.identicon) {
  flex-shrink: 0;
}

.identicon-link {
  display: flex;
  flex-shrink: 0;
  border-radius: 50%;
  line-height: 0;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.identicon-link:hover {
  text-decoration: none;
}

.has-wash .identity :deep(.identicon) {
  box-shadow: 0 0 0 3px var(--bg-primary);
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
}

button.achievements {
  cursor: pointer;
}

.achievements--static {
  cursor: default;
}

.stats {
  margin: 0;
  display: flex;
  flex-direction: column;
  font-size: 0.78rem;
  line-height: 1.25;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  margin-left: auto;
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
  text-decoration: none;
  cursor: pointer;
}

.icon-btn:hover {
  color: var(--text-primary);
  text-decoration: none;
}

.icon-btn :deep(.nq-icon) {
  width: 18px;
  height: 18px;
}
</style>
