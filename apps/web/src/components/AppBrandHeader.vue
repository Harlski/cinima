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
  -webkit-tap-highlight-color: transparent;
}

a.brand-home {
  pointer-events: auto;
  cursor: pointer;
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
