<template>
  <div class="pay-only-actions-root">
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

    <p v-if="showInquiriesLabel" class="pay-only-inquiries-label">
      {{ payOnlyGateCopy.inquiries }}
    </p>
    <ul class="pay-only-inquiries" aria-label="Contact Cinima">
      <li v-for="channel in channels" :key="channel.name">
        <a
          v-if="channel.href"
          class="pay-only-inquiry"
          :href="channel.href"
          :target="channel.name === 'Email' ? undefined : '_blank'"
          :rel="channel.name === 'Email' ? undefined : 'noopener noreferrer'"
          :aria-label="
            channel.name === 'Email' ? `Email ${INQUIRIES_EMAIL}` : channel.name
          "
        >
          <NqIcon :name="channel.icon" :size="20" />
          <span>{{ channel.name }}</span>
        </a>
        <span
          v-else
          class="pay-only-inquiry pay-only-inquiry--pending"
          role="img"
          :aria-label="`${channel.name}, no link yet`"
        >
          <NqIcon :name="channel.icon" :size="20" />
          <span>{{ channel.name }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import NqIcon from "@/components/NqIcon.vue";
import {
  GET_NIMIQ_PAY_URL,
  INQUIRIES_EMAIL,
  cinimaSocial,
  payGateSocial,
  payOnlyGateCopy,
  type CinimaSocialChannel,
} from "@/lib/contact";

const props = withDefaults(
  defineProps<{
    alreadyInstalledUrl: string;
    /** `landing` = X + Email; `payGate` = X + Telegram. */
    socialVariant?: "landing" | "payGate";
    channels?: CinimaSocialChannel[];
    showInquiriesLabel?: boolean;
  }>(),
  {
    socialVariant: "payGate",
    showInquiriesLabel: true,
  }
);

const channels = computed(
  () =>
    props.channels ??
    (props.socialVariant === "landing" ? cinimaSocial : payGateSocial)
);
</script>

<style scoped>
.pay-only-actions-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
}

.pay-only-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
  width: 100%;
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
  margin: 0.15rem 0 0;
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
  flex-wrap: wrap;
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

.pay-only-inquiry--pending {
  opacity: 0.55;
  color: var(--text-secondary);
}

.pay-only-inquiry :deep(.nq-icon) {
  width: 18px;
  height: 18px;
}
</style>
