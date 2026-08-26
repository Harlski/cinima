<template>
  <div class="following-strip-dock">
    <div
      class="strip"
      role="listbox"
      aria-label="Following strip"
    >
      <div class="cell" role="option" aria-selected="false">
        <span class="label label--muted">Find</span>
        <button
          type="button"
          class="find-people"
          aria-label="Find people"
          @click="$emit('find-people')"
        >
          <svg
            class="find-hex"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-1.2 -1.2 20.4 19.4"
            width="44"
            height="42"
            aria-hidden="true"
          >
            <path
              class="find-hex-fill"
              d="m17.045 7.563-3.429-6.09a1.37 1.37 0 00-1.189-.702H5.57c-.489 0-.941.267-1.186.703L.954 7.563a1.44 1.44 0 000 1.405l3.43 6.088a1.36 1.36 0 001.186.703h6.858a1.36 1.36 0 001.186-.703l3.43-6.088c.246-.436.246-.97.001-1.405Z"
            />
          </svg>
          <span class="find-plus" aria-hidden="true">+</span>
        </button>
      </div>

      <div
        v-for="person in people"
        :key="person.walletAddress"
        class="cell"
        role="option"
        :aria-selected="person.walletAddress === selectedWallet"
      >
        <span
          v-if="person.walletAddress === selectedWallet"
          class="label"
        >{{ displayName(person.handle, person.walletAddress) }}</span>
        <span v-else class="label label--spacer" aria-hidden="true">&nbsp;</span>
        <button
          type="button"
          class="identicon-btn"
          :class="{ 'is-selected': person.walletAddress === selectedWallet }"
          :aria-label="displayName(person.handle, person.walletAddress)"
          @click="$emit('select', person.walletAddress)"
        >
          <Identicon :address="person.walletAddress" :size="44" alt="" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { displayName } from "@cinima/shared";
import type { FollowingPerson } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";

defineProps<{
  people: FollowingPerson[];
  selectedWallet: string | null;
}>();

defineEmits<{
  select: [wallet: string];
  "find-people": [];
}>();
</script>

<style scoped>
.following-strip-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--bottom-tabs-inset) + var(--discover-feed-tabs-height, 2.85rem));
  z-index: 44;
  padding-bottom: 0.2rem;
  background: linear-gradient(
    to top,
    var(--bg-primary) 0%,
    var(--bg-primary) 55%,
    transparent 100%
  );
  touch-action: none;
  overscroll-behavior: none;
}

.strip {
  display: flex;
  align-items: flex-end;
  gap: 0.7rem;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 0.35rem var(--column-pad) 0.55rem;
  scrollbar-width: none;
  touch-action: pan-x;
  max-width: var(--column-max);
  margin-inline: auto;
  box-sizing: border-box;
}

.strip::-webkit-scrollbar {
  display: none;
}

.cell {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
  min-width: 3.4rem;
}

.label {
  max-width: 4.4rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--text-primary);
  text-align: center;
}

.label--muted {
  color: var(--text-secondary);
  font-weight: 500;
}

.label--spacer {
  visibility: hidden;
}

.identicon-btn {
  width: 2.85rem;
  height: 2.85rem;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 999px;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0.72;
  transform: scale(0.94);
  transition:
    transform 0.18s ease,
    opacity 0.18s ease,
    border-color 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}

.identicon-btn :deep(.identicon) {
  border-radius: 999px;
}

.identicon-btn.is-selected {
  opacity: 1;
  transform: scale(1);
  border-color: var(--gold);
}

.find-people {
  position: relative;
  width: 2.85rem;
  height: 2.85rem;
  padding: 0;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.find-hex {
  display: block;
}

.find-hex-fill {
  fill: #0a0a0f;
  stroke: #f5f5f7;
  stroke-width: 1.35;
  stroke-linejoin: round;
  paint-order: stroke fill;
}

.find-plus {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #f5f5f7;
  font-size: 1.35rem;
  font-weight: 500;
  line-height: 1;
  pointer-events: none;
}
</style>
