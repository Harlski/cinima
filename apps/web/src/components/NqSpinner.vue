<template>
  <span class="nq-spinner" role="status">
    <NqIcon name="spinner" :size="size" class="nq-spinner-icon" />
    <span class="nq-spinner-label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import NqIcon from "@/components/NqIcon.vue";

withDefaults(
  defineProps<{
    size?: number;
    label?: string;
  }>(),
  {
    size: 32,
    label: "Loading",
  }
);
</script>

<style scoped>
.nq-spinner {
  position: relative;
  display: inline-flex;
  color: inherit;
}

.nq-spinner-icon {
  animation: nq-spin 0.8s linear infinite;
}

.nq-spinner-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes nq-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nq-spinner-icon {
    animation: none;
  }
}
</style>
