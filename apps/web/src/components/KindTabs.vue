<template>
  <div class="kind-tabs" role="tablist" :aria-label="ariaLabel">
    <button
      type="button"
      role="tab"
      class="kind-tab"
      :class="{ active: modelValue === 'tv' }"
      :aria-selected="modelValue === 'tv'"
      @click="$emit('update:modelValue', 'tv')"
    >
      TV Shows
    </button>
    <button
      type="button"
      role="tab"
      class="kind-tab"
      :class="{ active: modelValue === 'movie' }"
      :aria-selected="modelValue === 'movie'"
      @click="$emit('update:modelValue', 'movie')"
    >
      Movies
    </button>
  </div>
</template>

<script setup lang="ts">
import type { MediaType } from "@cinima/shared";

defineProps<{
  modelValue: MediaType;
  ariaLabel?: string;
}>();

defineEmits<{
  "update:modelValue": [value: MediaType];
}>();
</script>

<style scoped>
.kind-tabs {
  display: flex;
  padding: 0.15rem;
  background: var(--bg-surface);
  border-radius: 999px;
}

.kind-tab {
  padding: 0.3rem 0.75rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.kind-tab.active {
  background: var(--bg-primary);
  color: var(--text-primary);
}
</style>
