<template>
  <header
    class="app-brand"
    :class="{ 'app-brand--fixed': fixed }"
  >
    <div class="app-brand-inner">
      <component
        :is="linkToLanding ? 'RouterLink' : 'div'"
        class="brand-home"
        v-bind="linkToLanding ? { to: '/', 'aria-label': 'Cinima Landing' } : {}"
        @pointerdown="onBrandPointerDown"
        @pointerup="onBrandPointerUp"
        @pointercancel="onBrandPointerUp"
        @click.capture="onBrandClick"
      >
        <span class="brand-mark" aria-hidden="true">
          <NqIcon name="logos-nimiq-hexagon-outline-mono" :size="20" class="brand-mark-icon" />
        </span>
        <BrandWordmark size="sm" animate />
      </component>
      <RouterLink
        v-if="showCueLab"
        class="cue-lab-entry"
        :to="{ name: 'cue-lab' }"
      >
        Cues
      </RouterLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import BrandWordmark from "@/components/BrandWordmark.vue";
import NqIcon from "@/components/NqIcon.vue";
import { cueLabEntryVisible } from "@/lib/cueLab";
import { toggleForYouDebug } from "@/lib/forYouDebug";

const props = withDefaults(
  defineProps<{
    fixed?: boolean;
    /** When true, wordmark navigates to Landing (`/`). */
    linkToLanding?: boolean;
    /** Signed-in shell: show the DEV Cue lab entry. */
    cueLab?: boolean;
  }>(),
  {
    fixed: false,
    linkToLanding: false,
    cueLab: false,
  }
);

const showCueLab = computed(() => cueLabEntryVisible({ inAppShell: props.cueLab }));

const LONG_PRESS_MS = 650;
let pressTimer: ReturnType<typeof setTimeout> | undefined;
let longPress = false;
let taps = 0;
let tapReset: ReturnType<typeof setTimeout> | undefined;

function onBrandPointerDown() {
  longPress = false;
  pressTimer = window.setTimeout(() => {
    longPress = true;
    toggleForYouDebug();
  }, LONG_PRESS_MS);
}

function onBrandPointerUp() {
  if (pressTimer) window.clearTimeout(pressTimer);
  pressTimer = undefined;
}

function onBrandClick(event: MouseEvent) {
  if (longPress) {
    event.preventDefault();
    event.stopPropagation();
    longPress = false;
    taps = 0;
    return;
  }
  taps += 1;
  if (tapReset) window.clearTimeout(tapReset);
  tapReset = window.setTimeout(() => {
    taps = 0;
  }, 2000);
  if (taps >= 5) {
    event.preventDefault();
    event.stopPropagation();
    taps = 0;
    toggleForYouDebug();
  }
}
</script>

<style scoped>
.app-brand-inner {
  position: relative;
}

.brand-home {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: inherit;
  text-decoration: none;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

a.brand-home {
  pointer-events: auto;
  cursor: pointer;
  touch-action: manipulation;
}

.cue-lab-entry {
  position: absolute;
  right: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: auto;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gold);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.cue-lab-entry.router-link-active {
  color: var(--text-primary);
}
</style>
