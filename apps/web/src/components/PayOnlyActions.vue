<template>
  <div class="pay-only-actions-root">
    <nav class="pay-only-actions" aria-label="Open Cinima in Nimiq Pay">
      <div class="pay-only-cta">
        <GoldGlowShell
          v-if="coach.glow === 'alreadyInstalled' && glowAlreadyInstalled"
          radius="0.75rem"
          class="pay-only-cta-glow"
        >
          <a
            class="pay-only-link"
            :href="alreadyInstalledUrl"
            :aria-describedby="fullAccessTooltipId"
            @click="onAlreadyInstalledClick"
          >
            {{ payOnlyGateCopy.alreadyInstalled }}
            (<span class="pay-only-open">{{ payOnlyGateCopy.alreadyInstalledOpen }}</span>)
          </a>
        </GoldGlowShell>
        <a
          v-else
          class="pay-only-link"
          :href="alreadyInstalledUrl"
          :aria-describedby="fullAccessTooltipId"
          @click="onAlreadyInstalledClick"
        >
          {{ payOnlyGateCopy.alreadyInstalled }}
          (<span class="pay-only-open">{{ payOnlyGateCopy.alreadyInstalledOpen }}</span>)
        </a>
        <span
          v-if="coach.showFullAccessTooltip"
          :id="fullAccessTipDomId"
          class="pay-only-tooltip"
          role="tooltip"
        >
          {{ payOnlyGateCopy.fullAccessOnlyOnMobile }}
        </span>
      </div>

      <div class="pay-only-cta">
        <GoldGlowShell
          v-if="coach.glow === 'getNimiqPay' && glowAlreadyInstalled"
          radius="0.75rem"
          class="pay-only-cta-glow"
        >
          <a
            class="pay-only-link"
            :href="GET_NIMIQ_PAY_URL"
            target="_blank"
            rel="noopener noreferrer"
            :aria-describedby="learnPayTooltipId"
          >
            {{ payOnlyGateCopy.getNimiqPay }}
          </a>
        </GoldGlowShell>
        <a
          v-else
          class="pay-only-link"
          :href="GET_NIMIQ_PAY_URL"
          target="_blank"
          rel="noopener noreferrer"
          :aria-describedby="learnPayTooltipId"
        >
          {{ payOnlyGateCopy.getNimiqPay }}
        </a>
        <span
          v-if="coach.showLearnPayTooltip"
          :id="learnPayTipDomId"
          class="pay-only-tooltip"
          role="tooltip"
        >
          {{ payOnlyGateCopy.learnAboutNimiqPay }}
        </span>
      </div>
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
import { computed, ref } from "vue";
import GoldGlowShell from "@/components/GoldGlowShell.vue";
import NqIcon from "@/components/NqIcon.vue";
import {
  GET_NIMIQ_PAY_URL,
  INQUIRIES_EMAIL,
  cinimaSocial,
  payGateSocial,
  payOnlyGateCopy,
  type CinimaSocialChannel,
} from "@/lib/contact";
import { readMobileHintSignals, seemsLikeMobile } from "@/lib/mobileHint";
import {
  afterDesktopAlreadyInstalledClick,
  initialPayOnlyCoachState,
  shouldInterceptAlreadyInstalledClick,
} from "@/lib/payOnlyCoach";

const props = withDefaults(
  defineProps<{
    alreadyInstalledUrl: string;
    /** `landing` = X + Email; `payGate` = X + Telegram. */
    socialVariant?: "landing" | "payGate";
    channels?: CinimaSocialChannel[];
    showInquiriesLabel?: boolean;
    /** Gold rim + desktop click coach on the Sorry! pay-only gate. */
    glowAlreadyInstalled?: boolean;
  }>(),
  {
    socialVariant: "payGate",
    showInquiriesLabel: true,
    glowAlreadyInstalled: false,
  }
);

const channels = computed(
  () =>
    props.channels ??
    (props.socialVariant === "landing" ? cinimaSocial : payGateSocial)
);

const isDesktop =
  typeof window !== "undefined" && !seemsLikeMobile(readMobileHintSignals());
const coach = ref(initialPayOnlyCoachState());

const fullAccessTipDomId = "pay-only-full-access-tip";
const learnPayTipDomId = "pay-only-learn-pay-tip";

const fullAccessTooltipId = computed(() =>
  coach.value.showFullAccessTooltip ? fullAccessTipDomId : undefined
);
const learnPayTooltipId = computed(() =>
  coach.value.showLearnPayTooltip ? learnPayTipDomId : undefined
);

function onAlreadyInstalledClick(event: MouseEvent): void {
  if (
    !shouldInterceptAlreadyInstalledClick({
      coachEnabled: props.glowAlreadyInstalled,
      isDesktop,
    })
  ) {
    return;
  }
  event.preventDefault();
  coach.value = afterDesktopAlreadyInstalledClick(coach.value);
}
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

.pay-only-cta {
  position: relative;
  width: 100%;
}

.pay-only-cta-glow {
  display: block;
  width: 100%;
}

.pay-only-cta-glow :deep(.gold-glow-content) {
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

.pay-only-tooltip {
  position: absolute;
  left: calc(100% + 0.7rem);
  top: 50%;
  z-index: 3;
  transform: translateY(-50%);
  width: max-content;
  max-width: 11.5rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--gold);
  border-radius: 0.55rem;
  background: var(--colors-neutral-50);
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.3;
  text-align: left;
  box-shadow: 0 8px 20px color-mix(in oklch, var(--colors-neutral) 40%, transparent);
  pointer-events: none;
}

.pay-only-tooltip::before {
  content: "";
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-right-color: var(--gold);
}

.pay-only-tooltip::after {
  content: "";
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%) translateX(1px);
  border: 6px solid transparent;
  border-right-color: var(--colors-neutral-50);
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

@media (max-width: 42rem) {
  .pay-only-tooltip {
    left: 50%;
    right: auto;
    top: auto;
    bottom: calc(100% + 0.45rem);
    transform: translateX(-50%);
  }

  .pay-only-tooltip::before {
    right: auto;
    left: 50%;
    top: 100%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: var(--gold);
  }

  .pay-only-tooltip::after {
    right: auto;
    left: 50%;
    top: 100%;
    transform: translateX(-50%) translateY(-1px);
    border: 6px solid transparent;
    border-top-color: var(--colors-neutral-50);
  }
}
</style>
