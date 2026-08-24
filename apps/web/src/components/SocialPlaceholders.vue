<template>
  <ul class="social-placeholders" aria-label="Contact Cinima">
    <li v-for="channel in cinimaSocial" :key="channel.name">
      <a
        v-if="channel.href"
        class="social-placeholder"
        :href="channel.href"
        :target="channel.name === 'X' ? '_blank' : undefined"
        :rel="channel.name === 'X' ? 'noopener noreferrer' : undefined"
        :aria-label="channel.name === 'Email' ? `Email ${INQUIRIES_EMAIL}` : channel.name"
      >
        <NqIcon :name="channel.icon" :size="20" />
      </a>
      <span
        v-else
        class="social-placeholder social-placeholder--pending"
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
import { INQUIRIES_EMAIL, cinimaSocial } from "@/lib/contact";
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
  color: var(--text-primary);
  opacity: 1;
  text-decoration: none;
}

.social-placeholder:hover {
  background: var(--colors-neutral-300);
}

.social-placeholder--pending {
  opacity: 0.55;
  color: var(--text-secondary);
}

.social-placeholder :deep(.nq-icon) {
  width: 20px;
  height: 20px;
}
</style>
