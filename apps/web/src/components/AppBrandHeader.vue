<template>
  <header
    class="app-brand"
    :class="{ 'app-brand--fixed': fixed }"
  >
    <div class="app-brand-inner">
      <span class="brand-mark" aria-hidden="true">
        <NqIcon name="logos-nimiq-hexagon-outline-mono" :size="20" class="brand-mark-icon" />
      </span>
      <BrandWordmark size="sm" animate />
    </div>
  </header>
</template>

<script setup lang="ts">
import BrandWordmark from "@/components/BrandWordmark.vue";
import NqIcon from "@/components/NqIcon.vue";

withDefaults(
  defineProps<{
    fixed?: boolean;
  }>(),
  {
    fixed: false,
  }
);
</script>
