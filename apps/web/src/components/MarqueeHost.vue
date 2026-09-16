<template>
  <div
    v-if="current && title"
    class="marquee"
    data-scroll-trap
    role="status"
    aria-live="polite"
  >
    <Transition name="marquee-pop" appear mode="out-in">
      <div :key="current.kind" class="marquee-slide">
        <button type="button" class="marquee-bar" aria-label="Open Credits" @click="openCredits">
          <p class="marquee-label">Achievement</p>
          <p class="marquee-title">{{ title }}</p>
          <p v-if="how" class="marquee-how">{{ how }}</p>
        </button>
        <button type="button" class="marquee-x" aria-label="Dismiss" @click="store.dismiss()">
          <NqIcon name="cross" :size="18" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import NqIcon from "@/components/NqIcon.vue";
import { useAuthStore } from "@/stores/auth";
import { useMarqueeStore } from "@/stores/marquee";

const store = useMarqueeStore();
const auth = useAuthStore();
const router = useRouter();
const { current, title, how } = storeToRefs(store);

function openCredits() {
  const wallet = auth.user?.walletAddress;
  if (!wallet) return;
  store.dismissAll();
  void router.push({ name: "credits", params: { wallet } });
}
</script>

<style scoped>
.marquee {
  position: fixed;
  left: 0;
  right: 0;
  /* Cover the brand row so the bar can travel behind it, then rest below. */
  top: var(--vv-offset-top, 0px);
  z-index: 44;
  overflow: hidden;
  pointer-events: none;
  padding-top: var(--app-brand-row, 2.75rem);
}

.marquee-slide {
  position: relative;
}

.marquee-pop-enter-active {
  animation: marquee-in 0.38s cubic-bezier(0.25, 0, 0, 1);
}

@keyframes marquee-in {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

.marquee-bar {
  pointer-events: auto;
  position: relative;
  display: block;
  width: 100%;
  padding: 0.7rem 2.4rem 0.8rem 1rem;
  border: 0;
  text-align: left;
  font: inherit;
  cursor: pointer;
  background: var(--gold);
  color: var(--colors-neutral-0);
}

.marquee-label {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in oklch, var(--colors-neutral-0) 68%, transparent);
}

.marquee-title {
  margin: 0.15rem 0 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--colors-neutral-0);
}

.marquee-how {
  margin: 0.15rem 0 0;
  font-size: 0.88rem;
  color: color-mix(in oklch, var(--colors-neutral-0) 78%, transparent);
}

.marquee-x {
  pointer-events: auto;
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  z-index: 1;
  display: grid;
  place-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--colors-neutral-0);
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .marquee-pop-enter-active {
    animation: none;
  }
}
</style>
