<template>
  <div class="pay-only-modal" role="presentation" @click.self="$emit('close')">
    <div
      class="pay-only-dialog nq-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-only-title"
    >
      <button type="button" class="pay-only-close" aria-label="Close" @click="$emit('close')">
        <NqIcon name="cross" :size="20" />
      </button>

      <h2 id="pay-only-title">{{ payOnlyGateCopy.title }}</h2>
      <p class="pay-only-body">{{ payOnlyGateCopy.body }}</p>

      <nav class="pay-only-actions" aria-label="Open Cinima in Nimiq Pay">
        <a class="pay-only-link" :href="alreadyInstalledUrl">
          {{ payOnlyGateCopy.alreadyInstalled }}
          (<span class="pay-only-open">{{ payOnlyGateCopy.alreadyInstalledOpen }}</span>)
        </a>
        <a
          class="pay-only-link"
          :href="GET_NIMIQ_PAY_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ payOnlyGateCopy.getNimiqPay }}
        </a>
      </nav>

      <p class="pay-only-inquiries-label">{{ payOnlyGateCopy.inquiries }}</p>
      <ul class="pay-only-inquiries" aria-label="Contact Cinima">
        <li v-for="channel in cinimaSocial" :key="channel.name">
          <a
            class="pay-only-inquiry"
            :href="channel.href"
            :target="channel.name === 'X' ? '_blank' : undefined"
            :rel="channel.name === 'X' ? 'noopener noreferrer' : undefined"
            :aria-label="
              channel.name === 'Email' ? `Email ${INQUIRIES_EMAIL}` : channel.name
            "
          >
            <NqIcon :name="channel.icon" :size="20" />
            <span>{{ channel.name }}</span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import NqIcon from "@/components/NqIcon.vue";
import {
  GET_NIMIQ_PAY_URL,
  INQUIRIES_EMAIL,
  cinimaSocial,
  payOnlyGateCopy,
} from "@/lib/contact";

defineProps<{
  alreadyInstalledUrl: string;
}>();

defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.pay-only-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.pay-only-dialog {
  position: relative;
  width: min(100%, 24rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 2.25rem 1.75rem 1.75rem;
  text-align: center;
  background-color: color-mix(in oklch, var(--colors-neutral-50) 72%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.pay-only-close {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  padding: 0.35rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.pay-only-dialog h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
}

.pay-only-body {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
}

.pay-only-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
  width: 100%;
  margin-top: 0.35rem;
}

.pay-only-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 0.75rem;
  background: var(--colors-neutral-200);
  color: #fff;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 650;
  text-decoration: none;
}

.pay-only-link:hover {
  background: var(--colors-neutral-300, var(--colors-neutral-200));
}

.pay-only-open {
  color: var(--gold);
}

.pay-only-inquiries-label {
  margin: 0.65rem 0 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.pay-only-inquiries {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
}

.pay-only-inquiry {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: var(--colors-neutral-200);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.pay-only-inquiry:hover {
  background: var(--colors-neutral-300);
}

.pay-only-inquiry :deep(.nq-icon) {
  width: 18px;
  height: 18px;
}
</style>
