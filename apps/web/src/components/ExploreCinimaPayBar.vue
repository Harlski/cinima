<template>
  <nav class="explore-pay-float">
    <div class="app-column explore-pay-float-inner">
      <button
        type="button"
        class="explore-pay-btn"
        :aria-label="landingCopy.ctaExplore"
        @click="open = true"
      >
        <span class="explore-pay-prefix" aria-hidden="true">Explore</span>
        <BrandWordmark size="sm" accent aria-hidden="true" />
      </button>
    </div>
  </nav>

  <PayOnlyGateModal
    v-if="open"
    :already-installed-url="alreadyInstalledUrl"
    :social-variant="socialVariant"
    @close="open = false"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import BrandWordmark from "@/components/BrandWordmark.vue";
import PayOnlyGateModal from "@/components/PayOnlyGateModal.vue";
import { landingCopy } from "@/lib/contact";

withDefaults(
  defineProps<{
    alreadyInstalledUrl: string;
    socialVariant?: "landing" | "payGate";
  }>(),
  {
    socialVariant: "payGate",
  }
);

const open = ref(false);
</script>

<style scoped>
.explore-pay-float {
  /* Extra lift above OS nav — safe-area alone is often 0 on Android */
  --explore-pay-float-bottom: calc(2.75rem + env(safe-area-inset-bottom, 0px));
  position: relative;
  flex-shrink: 0;
  z-index: 50;
  background: transparent;
  border: 0;
  padding: 0.5rem 0 var(--explore-pay-float-bottom);
  pointer-events: none;
}

.explore-pay-float-inner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  pointer-events: none;
}

.explore-pay-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0;
  padding: 1.1rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0.9rem;
  background: var(--colors-neutral-200);
  color: #fff;
  cursor: pointer;
  pointer-events: auto;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    0 0 18px rgba(255, 255, 255, 0.35),
    0 0 36px rgba(255, 255, 255, 0.18);
  -webkit-tap-highlight-color: transparent;
}

.explore-pay-btn:hover {
  background: var(--colors-neutral-300, var(--colors-neutral-200));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.2),
    0 0 22px rgba(255, 255, 255, 0.45),
    0 0 44px rgba(255, 255, 255, 0.22);
}

.explore-pay-prefix {
  color: #fff;
  font-weight: 600;
}

.explore-pay-btn :deep(.brand-wordmark) {
  font-size: 1.2rem;
}
</style>
