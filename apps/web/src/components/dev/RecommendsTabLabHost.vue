<template>
  <div class="lab" data-lab="recommends-tab">
    <RecommendsTabBillboard v-if="variant === 'billboard'" :fixture="fixture" />
    <RecommendsTabChart v-else-if="variant === 'chart'" :fixture="fixture" />
    <RecommendsTabMosaic v-else-if="variant === 'mosaic'" :fixture="fixture" />
    <RecommendsTabPeers v-else :fixture="fixture" />

    <div class="switcher" role="group" aria-label="Recommends tab variants">
      <button type="button" class="switcher-btn" aria-label="Close preview" @click="$emit('close')">
        <NqIcon name="cross" :size="16" />
      </button>
      <button type="button" class="switcher-btn" aria-label="Previous layout" @click="goPrev">
        ←
      </button>
      <p class="switcher-label">
        <span class="switcher-index">{{ index + 1 }}/{{ count }}</span>
        {{ label }}
      </p>
      <button type="button" class="switcher-btn" aria-label="Next layout" @click="goNext">
        →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import NqIcon from "@/components/NqIcon.vue";
import RecommendsTabBillboard from "@/components/dev/RecommendsTabBillboard.vue";
import RecommendsTabChart from "@/components/dev/RecommendsTabChart.vue";
import RecommendsTabMosaic from "@/components/dev/RecommendsTabMosaic.vue";
import RecommendsTabPeers from "@/components/dev/RecommendsTabPeers.vue";
import {
  cueLabRecommendsTabFixture,
  nextRecommendsTabVariant,
  prevRecommendsTabVariant,
  RECOMMENDS_TAB_VARIANTS,
  recommendsTabVariantIndex,
  recommendsTabVariantShort,
  type RecommendsTabVariantId,
} from "@/lib/recommendsTabLab";

const props = defineProps<{
  variant: RecommendsTabVariantId;
}>();

const emit = defineEmits<{
  close: [];
  variant: [id: RecommendsTabVariantId];
}>();

const fixture = cueLabRecommendsTabFixture();
const count = RECOMMENDS_TAB_VARIANTS.length;
const index = computed(() => recommendsTabVariantIndex(props.variant));
const label = computed(() => recommendsTabVariantShort(props.variant));

function goNext() {
  emit("variant", nextRecommendsTabVariant(props.variant));
}

function goPrev() {
  emit("variant", prevRecommendsTabVariant(props.variant));
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target;
  if (target instanceof HTMLElement) {
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    goNext();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    goPrev();
  } else if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
.lab {
  min-height: 100%;
  padding: 0.35rem 0 7.25rem;
}

.switcher {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--bottom-tabs-inset, 5rem) + 0.65rem);
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: min(calc(100% - 1.5rem), 22.5rem);
  padding: 0.35rem 0.4rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in oklch, var(--colors-neutral) 88%, transparent);
  box-shadow: 0 8px 28px color-mix(in oklch, var(--colors-neutral) 45%, transparent);
  color: var(--colors-neutral-0);
}

.switcher-btn {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 2.15rem;
  height: 2.15rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: color-mix(in oklch, var(--colors-neutral-0) 16%, transparent);
  color: inherit;
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.switcher-btn :deep(.nq-icon) {
  width: 16px;
  height: 16px;
}

.switcher-label {
  margin: 0;
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.switcher-index {
  display: block;
  font-size: 0.65rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  color: color-mix(in oklch, var(--colors-neutral-0) 72%, transparent);
}
</style>
