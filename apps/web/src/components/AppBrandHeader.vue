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
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import BrandWordmark from "@/components/BrandWordmark.vue";
import NqIcon from "@/components/NqIcon.vue";

withDefaults(
  defineProps<{
    fixed?: boolean;
    /** When true, wordmark navigates to Landing (`/`). */
    linkToLanding?: boolean;
  }>(),
  {
    fixed: false,
    linkToLanding: false,
  }
);
</script>

<style scoped>
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
</style>
