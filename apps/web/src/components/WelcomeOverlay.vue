<template>
  <Teleport to="body">
    <Transition name="welcome">
      <div
        v-if="open"
        class="welcome-overlay"
        role="status"
        aria-live="polite"
      >
        <div class="welcome-card">
          <button
            v-if="forcePickEnabled"
            type="button"
            class="welcome-identicon-btn"
            title="Dev: open Favorites onboarding"
            aria-label="Dev: open Favorites onboarding"
            @click="$emit('force-pick')"
          >
            <Identicon
              class="welcome-identicon"
              :address="walletAddress"
              :size="88"
              alt=""
            />
          </button>
          <Identicon
            v-else
            class="welcome-identicon"
            :address="walletAddress"
            :size="88"
            alt=""
          />
          <p class="welcome-message">{{ message }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import Identicon from "@/components/Identicon.vue";

withDefaults(
  defineProps<{
    open: boolean;
    walletAddress: string;
    message: string;
    /** Local / demo: identicon is tappable to force Favorites onboarding */
    forcePickEnabled?: boolean;
  }>(),
  { forcePickEnabled: false }
);

defineEmits<{
  "force-pick": [];
}>();
</script>

<style scoped>
.welcome-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.welcome-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.15rem;
  padding: 1.75rem 2rem;
  text-align: center;
}

.welcome-identicon-btn {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  -webkit-tap-highlight-color: transparent;
}

.welcome-identicon-btn:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 4px;
}

.welcome-identicon-btn:active .welcome-identicon {
  transform: scale(0.96);
}

.welcome-identicon {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  transition: transform 0.12s ease;
}

.welcome-message {
  margin: 0;
  font-size: clamp(1.45rem, 4.5vw, 1.85rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
  line-height: 1.2;
}

.welcome-enter-active {
  transition: opacity 0.35s ease;
}

.welcome-leave-active {
  transition: opacity 0.45s ease;
}

.welcome-enter-from,
.welcome-leave-to {
  opacity: 0;
}

.welcome-enter-active .welcome-card {
  animation: welcome-pop 0.45s var(--ease, cubic-bezier(0.25, 0, 0, 1)) both;
}

.welcome-leave-active .welcome-card {
  animation: welcome-out 0.45s ease both;
}

@keyframes welcome-pop {
  from {
    opacity: 0;
    transform: scale(0.86) translateY(0.6rem);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes welcome-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.04);
  }
}

@media (prefers-reduced-motion: reduce) {
  .welcome-enter-active,
  .welcome-leave-active {
    transition: opacity 0.2s ease;
  }

  .welcome-enter-active .welcome-card,
  .welcome-leave-active .welcome-card {
    animation: none;
  }

  .welcome-identicon-btn:active .welcome-identicon {
    transform: none;
  }
}
</style>
