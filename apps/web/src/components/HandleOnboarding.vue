<template>
  <div class="handle-onboarding">
    <div class="panel-shell">
      <div class="panel nq-card">
        <header class="header">
          <h2>Choose your username</h2>
          <p>Your public Cinima identity - friends can find you by this name.</p>
        </header>

        <Identicon v-if="walletAddress" :address="walletAddress" :size="72" alt="" />

        <div class="field">
          <label class="field-label" for="username-input">Username</label>
          <input
            id="username-input"
            v-model="draft"
            class="username-input"
            placeholder="yourname"
            maxlength="24"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :disabled="busy"
            @keydown.enter="submit"
          />
          <p v-if="localError" class="error">{{ localError }}</p>
          <p v-else-if="saveError" class="error">{{ saveError }}</p>
        </div>

        <p class="profile-note">You can change this anytime from your profile.</p>

        <button
          type="button"
          class="continue"
          :disabled="busy || !canSave"
          @click="submit"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Identicon from "@/components/Identicon.vue";
import { handleValidationError } from "@/lib/handleOnboarding";

const props = withDefaults(
  defineProps<{
    walletAddress: string | null;
    initialHandle?: string | null;
    busy?: boolean;
    saveError?: string | null;
  }>(),
  {
    initialHandle: null,
    busy: false,
    saveError: null,
  }
);

const emit = defineEmits<{
  continue: [handle: string];
}>();

const draft = ref(props.initialHandle ?? "");
const localError = ref<string | null>(null);

const canSave = computed(() => !handleValidationError(draft.value));

watch(
  () => props.saveError,
  (err) => {
    if (err) localError.value = null;
  }
);

watch(draft, () => {
  localError.value = null;
});

function submit() {
  const err = handleValidationError(draft.value);
  if (err) {
    localError.value = err;
    return;
  }
  const cleaned = draft.value.replace(/^@/, "").trim().toLowerCase();
  emit("continue", cleaned);
}
</script>

<style scoped>
.handle-onboarding {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: calc(100dvh - var(--app-brand-row, 3.5rem) - var(--bottom-tabs-inset));
  padding-bottom: 1rem;
}

.panel-shell {
  position: relative;
  width: min(100%, 22rem);
  border-radius: 1.75rem;
}

.panel-shell::before,
.panel-shell::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  pointer-events: none;
  background: conic-gradient(
    from var(--panel-glow-angle, 0deg),
    transparent 0deg 195deg,
    color-mix(in oklch, var(--gold) 20%, transparent) 230deg,
    var(--gold) 270deg,
    #ffe9a8 295deg,
    var(--gold) 325deg,
    transparent 360deg
  );
  animation: panel-glow-spin 5.5s linear infinite;
}

.panel-shell::before {
  z-index: 0;
  inset: -8px;
  filter: blur(12px);
  opacity: 0.65;
}

.panel-shell::after {
  z-index: 0;
  inset: -2px;
  padding: 1.5px;
  opacity: 0.95;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.panel {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.15rem;
  padding: 1.5rem 1.25rem 1.35rem;
  border-radius: 1.75rem;
  overflow: hidden;
  text-align: center;
  background: var(--bg-surface, var(--colors-neutral-50));
}

.panel::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background-image: url("../assets/hex-pattern.svg");
  background-repeat: repeat;
  background-size: 5.25rem 4.5rem;
  background-position: 0 0;
  opacity: 0.07;
}

.panel > * {
  position: relative;
  z-index: 1;
}

@property --panel-glow-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@keyframes panel-glow-spin {
  to {
    --panel-glow-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel-shell::before,
  .panel-shell::after {
    animation: none;
  }
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.header h2 {
  margin: 0;
  font-size: 1.45rem;
  color: var(--text-primary);
}

.header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.35;
}

.field {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.username-input {
  box-sizing: border-box;
  width: 100%;
  max-width: 12.5rem;
  margin-inline: auto;
  padding: 0.7rem 0.9rem;
  border: 0;
  border-radius: 0.75rem;
  background: #fff;
  color: #111;
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.username-input::placeholder {
  color: rgba(17, 17, 17, 0.4);
  font-weight: 500;
}

.username-input:focus {
  outline: 1.5px solid var(--outline-color, var(--gold));
  outline-offset: 2px;
}

.username-input:disabled {
  opacity: 0.7;
}

.error {
  margin: 0;
  max-width: 16rem;
  font-size: 0.85rem;
  color: var(--colors-red, #e74c3c);
  line-height: 1.35;
}

.profile-note {
  margin: 0;
  max-width: 18rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.continue {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  margin-top: 0.15rem;
  padding: 1.2rem 1.65rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 0.9rem;
  background: var(--colors-neutral-200);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 0 10px rgba(255, 255, 255, 0.16);
  -webkit-tap-highlight-color: transparent;
}

.continue:hover:not(:disabled) {
  background: var(--colors-neutral-300, var(--colors-neutral-200));
}

.continue:disabled {
  opacity: 0.7;
  cursor: default;
}

.continue:active:not(:disabled) {
  transform: scale(0.98);
}
</style>
