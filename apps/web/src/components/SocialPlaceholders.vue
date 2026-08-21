<template>
  <ul class="social-placeholders" aria-label="Cinima on social">
    <li v-for="channel in cinimaSocial" :key="channel.name">
      <span
        class="social-placeholder"
        role="img"
        :aria-label="`${channel.name}, no link yet`"
      >
        <NqIcon :name="channel.icon" :size="20" />
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import NqIcon from "@/components/NqIcon.vue";
import { cinimaSocial } from "@/lib/contact";
</script>

<style scoped>
.social-placeholders {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.social-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: var(--colors-neutral-200);
  color: var(--text-secondary);
  opacity: 0.55;
}

.social-placeholder :deep(.nq-icon) {
  width: 20px;
  height: 20px;
}
</style>
